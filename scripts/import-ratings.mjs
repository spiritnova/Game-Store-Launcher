// Adds ESRB/PEGI age ratings from the public Steam store API to data/game-details.json.
//
//   npm run import:ratings
//
// Games from the catalog list are looked up by app id; games added by hand are found by title.
// Safe to re-run: it refreshes every game's rating. New games imported with `npm run import:steam`
// get their rating automatically.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CATALOG } from './catalog.mjs'
import { fetchApp, parseRating, searchApp, slugify } from './steam.mjs'

const root = path.resolve(import.meta.dirname, '..')
const gamesPath = path.join(root, 'data', 'games.json')
const detailsPath = path.join(root, 'data', 'game-details.json')
const games = JSON.parse(await readFile(gamesPath, 'utf8'))
const details = JSON.parse(await readFile(detailsPath, 'utf8'))

// Hand-added games whose Steam title differs from ours
const APP_IDS = { 'the-witcher-3': 292030 }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pending = new Map(games.map((game) => [game.slug, game]))
const missing = []
let rated = 0

function apply(slug, data) {
  const rating = parseRating(data)
  if (rating) {
    details[slug].rating = rating
    rated++
  } else {
    delete details[slug].rating
    missing.push(`${slug}: no rating listed`)
  }
  pending.delete(slug)
}

for (const [id] of CATALOG) {
  const data = await fetchApp(id).catch(() => null)
  await sleep(450)
  const slug = data && slugify(data.name)
  if (slug && pending.has(slug)) apply(slug, data)
}

for (const game of [...pending.values()]) {
  const id = APP_IDS[game.slug] ?? (await searchApp(game.title).catch(() => null))
  const data = id && (await fetchApp(id).catch(() => null))
  await sleep(450)
  if (data) apply(game.slug, data)
  else missing.push(`${game.slug}: not found on Steam`)
}

await writeFile(detailsPath, JSON.stringify(details, null, 2) + '\n')
console.log(`Rated ${rated} of ${games.length} games.`)
if (missing.length) console.log(`Without a rating:\n  ${missing.join('\n  ')}`)
