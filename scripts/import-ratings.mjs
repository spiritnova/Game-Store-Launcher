// Adds ESRB/PEGI age ratings from the public Steam store API to data/game-details.json.
//
//   npm run import:ratings
//
// Safe to re-run: it refreshes every game's rating. New games imported with `npm run import:steam`
// get their rating automatically.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { forEachSteamGame, parseRating } from './steam.mjs'

const root = path.resolve(import.meta.dirname, '..')
const gamesPath = path.join(root, 'data', 'games.json')
const detailsPath = path.join(root, 'data', 'game-details.json')
const games = JSON.parse(await readFile(gamesPath, 'utf8'))
const details = JSON.parse(await readFile(detailsPath, 'utf8'))

const missing = []
let rated = 0

await forEachSteamGame(games, (game, data) => {
  const rating = data && parseRating(data)
  if (rating) {
    details[game.slug].rating = rating
    rated++
  } else {
    delete details[game.slug].rating
    missing.push(`${game.slug}: ${data ? 'no rating listed' : 'not found on Steam'}`)
  }
})

await writeFile(detailsPath, JSON.stringify(details, null, 2) + '\n')
console.log(`Rated ${rated} of ${games.length} games.`)
if (missing.length) console.log(`Without a rating:\n  ${missing.join('\n  ')}`)
