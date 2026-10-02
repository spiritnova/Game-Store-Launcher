// Imports downloadable content (expansions, season passes, add-on packs) from the public Steam store
// API into data/games.json, with their artwork in public/images/dlc.
//
//   npm run import:dlc                         every game
//   npm run import:dlc -- hades the-witcher-3  only these games
//
// Each game gets up to MAX_DLC paid add-ons, the biggest (by price) first. Soundtracks, artbooks and
// in-game currency or voucher packs are skipped. Safe to re-run: it refreshes the DLC of every game
// it visits, and deletes artwork for DLC that's no longer listed. Prices are the live US prices at
// import time. A full run takes about 15 minutes because Steam limits how fast its store API can be called.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { EXTRA_DLC } from './catalog.mjs'
import { decode, fetchApp, fetchPrices, forEachSteamGame, shorten, slugify, stripTags } from './steam.mjs'

const MAX_DLC = 4
// DLC lists can run into the hundreds (simulators); only the first ones are priced
const MAX_CANDIDATES = 60
// Soundtracks and extras, plus currency, voucher and booster packs (e.g. "1000000 Red Orbs", "7,200 Premier Pack")
const SKIP = /soundtrack|\bost\b|artbook|art book|wallpaper|\borbs\b|\bcoins?\b|\bcredits?\b|\bbfc\b|voucher|ticket|premier pack|welcome pack|\bpoints\b/i
const only = process.argv.slice(2)

const root = path.resolve(import.meta.dirname, '..')
const gamesPath = path.join(root, 'data', 'games.json')
const imageDir = path.join(root, 'public', 'images', 'dlc')
const games = JSON.parse(await readFile(gamesPath, 'utf8'))
await mkdir(imageDir, { recursive: true })

const letters = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '')

// The part of `name` after `prefix`, comparing letters and digits only, or null when it doesn't start with it
function afterPrefix(name, prefix) {
  const wanted = letters(prefix)
  let matched = 0
  let i = 0
  for (; i < name.length && matched < wanted.length; i++) {
    const char = name[i].toLowerCase()
    if (!/[a-z0-9]/.test(char)) continue
    if (char !== wanted[matched]) return null
    matched++
  }
  return matched === wanted.length ? name.slice(i) : null
}

// Drops the game's name from a DLC title:
// "The Witcher 3: Wild Hunt - Blood and Wine" -> "Blood and Wine",
// "Monster Hunter World: Iceborne" -> "Iceborne", "Battle Pass Bundle - Rainbow Six Siege" -> "Battle Pass Bundle"
function shortTitle(name, game, baseName) {
  let title = decode(name)
  for (const prefix of [baseName, game.title].filter(Boolean).map(decode)) {
    const rest = afterPrefix(title, prefix)?.replace(/^[\s:–—-]+/, '').trim()
    if (rest && rest.length > 3) {
      title = rest
      break
    }
  }
  const parts = title.split(/\s+[-–—]\s+/)
  const last = parts.at(-1)
  if (parts.length > 1 && letters(last).length >= 4 && letters(game.title).endsWith(letters(last))) title = parts.slice(0, -1).join(' - ')
  return title
}

// Keeps the key order readable: DLC goes right after the editions
function withDlc(game, dlc) {
  const { dlc: _old, ...rest } = game
  if (dlc.length === 0) return rest
  const out = {}
  for (const [key, value] of Object.entries(rest)) {
    out[key] = value
    if (key === 'editions') out.dlc = dlc
  }
  return out
}

const report = []
const updated = new Map()

await forEachSteamGame(only.length ? games.filter((game) => only.includes(game.slug)) : games, async (game, data) => {
  const extra = EXTRA_DLC[game.slug] ?? []
  const ids = [...extra.map(([id]) => id), ...(data?.dlc ?? []).slice(0, MAX_CANDIDATES)]
  const prices = await fetchPrices(ids).catch(() => ({}))
  for (const [id, price] of extra) prices[id] ??= { initial: price, final: price }
  const byPrice = ids.filter((id) => prices[id]?.initial > 0).sort((a, b) => prices[b].initial - prices[a].initial)

  const dlc = []
  for (const id of byPrice) {
    if (dlc.length >= MAX_DLC) break
    const d = await fetchApp(id).catch(() => null)
    if (!d?.name || d.type !== 'dlc' || SKIP.test(d.name) || !d.header_image) continue
    const image = await fetch(d.header_image).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null)
    if (!image) continue
    const title = shortTitle(d.name, game, data.name)
    const slug = slugify(title) || String(id)
    if (dlc.some((item) => item.id === slug)) continue
    const file = `${game.slug}--${slug}.jpg`
    await sharp(Buffer.from(image)).resize(460, 215, { fit: 'cover' }).jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(imageDir, file))
    const { initial, final } = prices[id]
    dlc.push({
      id: slug,
      title,
      description: shorten(stripTags(d.short_description ?? ''), 220),
      price: initial,
      ...(final < initial ? { salePrice: final } : {}),
      ...(d.release_date?.date && !d.release_date.coming_soon ? { releaseDate: new Date(`${d.release_date.date} UTC`).toISOString().slice(0, 10) } : {}),
      image: `/images/dlc/${file}`,
    })
  }
  updated.set(game.slug, dlc)
  report.push(`${game.title.padEnd(44)} ${dlc.length ? dlc.map((item) => item.title).join(' | ') : data ? '—' : 'not found on Steam'}`)
  console.log(report.at(-1))
})

const next = games.map((game) => withDlc(game, updated.get(game.slug) ?? game.dlc ?? []))
await writeFile(gamesPath, JSON.stringify(next, null, 2) + '\n')

const used = new Set(next.flatMap((game) => (game.dlc ?? []).map((item) => path.basename(item.image))))
for (const file of await readdir(imageDir)) {
  if (!used.has(file)) await rm(path.join(imageDir, file))
}
console.log(`\n${next.filter((g) => g.dlc).length} of ${games.length} games have DLC (${next.reduce((n, g) => n + (g.dlc?.length ?? 0), 0)} items).`)
console.log('Run `npm run images` to generate placeholders for the new artwork.')
