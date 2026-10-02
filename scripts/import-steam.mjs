// Imports games from the public Steam store API into data/games.json and data/game-details.json,
// and downloads/optimizes their artwork into public/images.
//
//   npm run import:steam
//
// Safe to re-run: games already in data/games.json (by slug) are skipped, so you can add an entry to
// CATALOG and run it again. Prices are the live US prices at import time. Run `npm run images`
// afterwards to regenerate the image placeholders.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { CATALOG } from './catalog.mjs'
import { decode, fetchApp, parseRating, slugify } from './steam.mjs'

const root = path.resolve(import.meta.dirname, '..')
const out = (...p) => path.join(root, 'public', 'images', ...p)
const SCREENSHOTS = 4


// Store categories -> our feature labels, in display order.
const FEATURES = [
  ['Single-player', ['Single-player']],
  ['Online multiplayer', ['Online PvP', 'PvP', 'Multi-player']],
  ['Online co-op', ['Online Co-op']],
  ['Local co-op & split screen', ['Shared/Split Screen', 'Shared/Split Screen Co-op', 'Shared/Split Screen PvP']],
  ['Cross-platform multiplayer', ['Cross-Platform Multiplayer']],
  ['Controller support', ['Full controller support', 'Partial Controller Support']],
  ['Achievements', ['Steam Achievements']],
  ['Cloud saves', ['Steam Cloud']],
  ['HDR', ['HDR available']],
  ['In-game purchases', ['In-App Purchases']],
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const stripTags = (html) => decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))

function shorten(text, max = 300) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const sentence = cut.lastIndexOf('. ')
  return sentence > max * 0.5 ? cut.slice(0, sentence + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…'
}

function parseRequirements(html) {
  if (!html) return []
  const rows = []
  for (const [, item] of html.matchAll(/<li>([\s\S]*?)<\/li>/g)) {
    const m = item.match(/<strong>([^<]+?):?<\/strong>\s*([\s\S]*)/)
    if (!m) continue
    const label = decode(m[1].replace(/:$/, ''))
    const value = stripTags(m[2])
    if (label && value) rows.push([label, value])
  }
  return rows
}

function parseLanguages(html) {
  const interfaceLangs = []
  const audio = []
  for (const raw of (html ?? '').split('<br>')[0].split(',').map((p) => p.trim()).filter(Boolean)) {
    const name = decode(raw.replace(/<strong>\*<\/strong>/g, '').replace(/<[^>]+>/g, ''))
    if (!name) continue
    interfaceLangs.push(name)
    if (raw.includes('<strong>*</strong>')) audio.push(name)
  }
  return { interface: interfaceLangs, audio }
}

function storageGB(rows) {
  const storage = rows.find(([label]) => /^(Storage|Hard Drive|Hard Disk)/i.test(label))
  const m = storage?.[1].match(/(\d+(?:[.,]\d+)?)\s*(GB|MB|TB)/i)
  if (!m) return null
  const value = Number(m[1].replace(',', '.'))
  const unit = m[2].toUpperCase()
  return unit === 'TB' ? value * 1024 : unit === 'MB' ? value / 1024 : value
}

async function get(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return Buffer.from(await r.arrayBuffer())
}

async function tryGet(url) {
  try {
    return await get(url)
  } catch {
    return null
  }
}

const gamesPath = path.join(root, 'data', 'games.json')
const detailsPath = path.join(root, 'data', 'game-details.json')
const games = JSON.parse(await readFile(gamesPath, 'utf8'))
const details = JSON.parse(await readFile(detailsPath, 'utf8'))
const known = new Set(games.map((g) => g.slug))

for (const dir of ['covers', 'banners', 'logos', 'screenshots']) await mkdir(out(dir), { recursive: true })

let added = 0
const skipped = []

for (const [id, genres] of CATALOG) {
  let d
  try {
    d = await fetchApp(id)
  } catch (error) {
    skipped.push(`${id}: ${error.message}`)
    await sleep(1500)
    continue
  }
  await sleep(450)
  if (!d) { skipped.push(`${id}: no store data`); continue }

  const slug = slugify(d.name)
  if (known.has(slug)) continue
  if (d.release_date?.coming_soon) { skipped.push(`${d.name}: not released yet`); continue }

  const free = Boolean(d.is_free)
  const overview = d.price_overview
  if (!free && !overview) { skipped.push(`${d.name}: no US price`); continue }

  const base = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${id}`
  const coverSrc = await tryGet(`${base}/library_600x900.jpg`)
  if (!coverSrc) { skipped.push(`${d.name}: no cover art`); continue }

  const shotSources = await Promise.all((d.screenshots ?? []).slice(0, SCREENSHOTS).map((s) => tryGet(s.path_full)))
  const shots = shotSources.filter(Boolean)
  if (shots.length === 0) { skipped.push(`${d.name}: no screenshots`); continue }

  // Artwork
  await sharp(coverSrc).resize(600, 800, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 80, mozjpeg: true }).toFile(out('covers', `${slug}.jpg`))

  const heroSrc = await tryGet(`${base}/library_hero.jpg`)
  const bannerPipeline = heroSrc
    ? sharp(heroSrc).resize({ width: 1920, withoutEnlargement: true })
    : sharp(shots[0]).resize(1920, 620, { fit: 'cover', position: 'attention' })
  await bannerPipeline.jpeg({ quality: 78, mozjpeg: true }).toFile(out('banners', `${slug}.jpg`))

  const logoSrc = await tryGet(`${base}/logo.png`)
  let logo
  if (logoSrc) {
    await sharp(logoSrc).resize({ width: 800, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toFile(out('logos', `${slug}.png`))
    logo = `/images/logos/${slug}.png`
  }

  const screenshots = []
  for (const [i, buf] of shots.entries()) {
    const file = `${slug}-${i + 1}.jpg`
    await sharp(buf).resize({ width: 1440, withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }).toFile(out('screenshots', file))
    screenshots.push(`/images/screenshots/${file}`)
  }

  // Data
  const minimum = parseRequirements(d.pc_requirements?.minimum)
  const recommended = parseRequirements(d.pc_requirements?.recommended)
  const categories = new Set((d.categories ?? []).map((c) => c.description))
  const initial = free ? 0 : overview.initial / 100
  const final = free ? 0 : overview.final / 100

  const game = {
    slug,
    title: decode(d.name),
    developer: decode(d.developers?.[0] ?? 'Unknown developer'),
    publisher: decode(d.publishers?.[0] ?? d.developers?.[0] ?? 'Unknown publisher'),
    releaseDate: new Date(`${d.release_date.date} UTC`).toISOString().slice(0, 10),
    // Free games always get the Free to Play category
    genres: free && !genres.includes('Free to Play') ? [...genres, 'Free to Play'] : genres,
    features: FEATURES.filter(([, keys]) => keys.some((k) => categories.has(k))).map(([label]) => label),
    price: initial,
    ...(final < initial ? { salePrice: final } : {}),
    cover: `/images/covers/${slug}.jpg`,
    banner: `/images/banners/${slug}.jpg`,
    ...(logo ? { logo } : {}),
    description: shorten(stripTags(d.short_description ?? d.about_the_game ?? '')),
    sizeGB: Math.round((storageGB(recommended) ?? storageGB(minimum) ?? 20) * 10) / 10,
    editions: [{ id: 'standard', name: 'Standard Edition', price: initial, includes: [] }],
  }

  details[slug] = {
    screenshots,
    languages: parseLanguages(d.supported_languages),
    requirements: { minimum, recommended },
    ...(d.metacritic?.score ? { metacritic: d.metacritic.score } : {}),
    ...(parseRating(d) ? { rating: parseRating(d) } : {}),
  }

  games.push(game)
  known.add(slug)
  added++
  console.log(`+ ${game.title.padEnd(44)} ${free ? 'Free' : '$' + final.toFixed(2).padStart(6)}${game.salePrice ? ` (was $${initial.toFixed(2)})` : ''}  ${genres.join(', ')}`)

  // Save as we go so an interrupted run keeps its progress
  await writeFile(gamesPath, JSON.stringify(games, null, 2) + '\n')
  await writeFile(detailsPath, JSON.stringify(details, null, 2) + '\n')
}

console.log(`\nAdded ${added} games (${games.length} total).`)
if (skipped.length) console.log(`Skipped:\n  ${skipped.join('\n  ')}`)
