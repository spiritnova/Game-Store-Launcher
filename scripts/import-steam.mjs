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

const root = path.resolve(import.meta.dirname, '..')
const out = (...p) => path.join(root, 'public', 'images', ...p)
const SCREENSHOTS = 4

// [Steam app id, our genres]. Genres are our own categories, not Steam's.
const CATALOG = [
  // Shooters & multiplayer
  [730, ['Shooter', 'Multiplayer', 'Free to Play']],
  [1172470, ['Shooter', 'Multiplayer', 'Free to Play']],
  [578080, ['Shooter', 'Multiplayer', 'Free to Play']],
  [359550, ['Shooter', 'Multiplayer']],
  [553850, ['Shooter', 'Multiplayer', 'Action']],
  [550, ['Shooter', 'Multiplayer', 'Horror']],
  [782330, ['Shooter', 'Action']],
  [379720, ['Shooter', 'Action']],
  // RPGs & open worlds
  [1245620, ['Action', 'RPG', 'Open World']],
  [1086940, ['RPG', 'Strategy']],
  [1091500, ['RPG', 'Open World', 'Shooter']],
  [377160, ['RPG', 'Open World', 'Shooter']],
  [489830, ['RPG', 'Open World']],
  [1716740, ['RPG', 'Open World']],
  [632470, ['RPG', 'Indie']],
  [1687950, ['RPG']],
  [582010, ['Action', 'RPG', 'Multiplayer']],
  [524220, ['Action', 'RPG']],
  // Action & adventure
  [374320, ['Action', 'RPG']],
  [814380, ['Action', 'Adventure']],
  [1817230, ['Action']],
  [870780, ['Action', 'Adventure', 'Shooter']],
  [1850570, ['Action', 'Adventure', 'Open World']],
  [3240220, ['Action', 'Open World', 'Multiplayer']],
  [1659040, ['Action', 'Adventure']],
  [203160, ['Action', 'Adventure']],
  [1172620, ['Adventure', 'Multiplayer', 'Open World']],
  [1426210, ['Adventure', 'Puzzle', 'Multiplayer']],
  [1868140, ['Adventure', 'Simulation', 'Indie']],
  // Indie, platformers & roguelikes
  [1145360, ['Action', 'Roguelike', 'Indie']],
  [367520, ['Action', 'Platformer', 'Indie']],
  [504230, ['Platformer', 'Indie']],
  [268910, ['Platformer', 'Action', 'Indie']],
  [1057090, ['Platformer', 'Adventure']],
  [588650, ['Roguelike', 'Platformer', 'Action']],
  [1794680, ['Roguelike', 'Action', 'Indie']],
  [646570, ['Roguelike', 'Strategy', 'Indie']],
  [2379780, ['Roguelike', 'Strategy', 'Indie']],
  [620, ['Puzzle', 'Adventure']],
  // Horror
  [2050650, ['Horror', 'Action', 'Shooter']],
  [1196590, ['Horror', 'Action', 'Shooter']],
  [1693980, ['Horror', 'Shooter']],
  [739630, ['Horror', 'Multiplayer', 'Indie']],
  [1966720, ['Horror', 'Multiplayer', 'Indie']],
  [953490, ['Horror', 'Adventure', 'Puzzle']],
  [238320, ['Horror']],
  // Survival & sandbox
  [105600, ['Adventure', 'Survival', 'Indie']],
  [892970, ['Survival', 'Adventure', 'Multiplayer']],
  [264710, ['Survival', 'Adventure', 'Open World']],
  [242760, ['Survival', 'Horror']],
  [252490, ['Survival', 'Multiplayer']],
  [1623730, ['Survival', 'Open World', 'Multiplayer']],
  [108600, ['Survival', 'Horror', 'Indie']],
  // Strategy & simulation
  [289070, ['Strategy']],
  [1142710, ['Strategy']],
  [813780, ['Strategy']],
  [281990, ['Strategy', 'Simulation']],
  [268500, ['Strategy']],
  [255710, ['Simulation', 'Strategy']],
  [427520, ['Simulation', 'Strategy', 'Indie']],
  [526870, ['Simulation', 'Open World', 'Survival']],
  [294100, ['Simulation', 'Strategy', 'Indie']],
  [413150, ['Simulation', 'RPG', 'Indie']],
  [570, ['Strategy', 'Multiplayer', 'Free to Play']],
  // Racing & sports
  [1551360, ['Racing', 'Open World']],
  [244210, ['Racing', 'Simulation']],
  [227300, ['Simulation', 'Racing']],
  [1846380, ['Racing']],
  [3551340, ['Sports', 'Simulation', 'Strategy']],
  [3472040, ['Sports']],
  [3405690, ['Sports', 'Multiplayer']],
  [3717070, ['Sports', 'Fighting']],
  [2290180, ['Sports', 'Open World', 'Multiplayer']],
  [3077390, ['Sports', 'Racing']],
  [2385530, ['Sports']],
  [2395210, ['Sports', 'Platformer']],
  [681280, ['Sports', 'Indie', 'Racing']],
  [1465360, ['Simulation', 'Racing', 'Open World']],
  [1665460, ['Sports', 'Multiplayer', 'Free to Play']],
  // Fighting & party
  [1364780, ['Fighting']],
  [1778820, ['Fighting']],
  [1971870, ['Fighting']],
  [945360, ['Multiplayer', 'Casual']],
  [728880, ['Casual', 'Multiplayer']],
]

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

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/[®™©]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const stripTags = (html) => decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))

function slugify(name) {
  return decode(name)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

async function fetchApp(id) {
  const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=us&l=english`)
  if (!r.ok) throw new Error(`appdetails ${r.status}`)
  const entry = (await r.json())[id]
  return entry?.success ? entry.data : null
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
    features: FEATURES.filter(([, keys]) => keys.some((k) => categories.has(k))).map(([label]) => label),
    languages: parseLanguages(d.supported_languages),
    requirements: { minimum, recommended },
    ...(d.metacritic?.score ? { metacritic: d.metacritic.score } : {}),
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
