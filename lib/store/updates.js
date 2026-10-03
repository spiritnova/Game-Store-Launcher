import { getGame, isReleased } from '@/lib/games'
import { hash, pick, random } from '@/lib/random'

const DAY = 24 * 60 * 60 * 1000

// Installed games get an update now and then, decided deterministically per game and week so the
// Library, game pages and Downloads page always agree. No server involved.
const WEEK = 7 * DAY
export const currentWeek = () => Math.floor(Date.now() / WEEK)

const PATCH_NOTES = [
  'Performance improvements on lower-end graphics cards',
  'Fixed a crash when switching windows during cutscenes',
  'Controller remapping fixes',
  'Shorter loading times when continuing a save',
  'New photo mode filters',
  'Improved ultrawide monitor support',
  'Updated translations',
  'Fixed rare save corruption after a power loss',
  'Audio mixing improvements',
  'Accessibility: larger subtitle options',
]
const ONLINE_NOTES = ['Balance changes for the current season', 'Anti-cheat and server stability updates', 'Matchmaking improvements']

// The version a game installs at, before any updates
function baseVersion(slug) {
  const h = hash(`version:${slug}`)
  return `${1 + (h % 3)}.${(h >> 3) % 10}.${(h >> 7) % 8}`
}

export function installedVersion(entry) {
  return entry.version ?? baseVersion(entry.slug)
}

// Size, version and patch notes for an update, the same wherever it's shown
function describeUpdate(entry, seed, sizeGB) {
  const game = getGame(entry.slug)
  const [major, minor, patch] = installedVersion(entry).split('.').map(Number)
  const rand = random(hash(`notes:${entry.slug}:${seed}`))
  const pool = game?.features.includes('Online multiplayer') ? [...ONLINE_NOTES, ...PATCH_NOTES] : PATCH_NOTES
  return { sizeGB, version: `${major}.${minor}.${patch + 1}`, notes: pick(rand, pool, 2 + Math.floor(rand() * 2)) }
}

// The update waiting for an installed game, or null. Some arrive weekly at random; demo games can
// also start with one pending (`pendingUpdate`).
export function getUpdate(entry, week = currentWeek()) {
  if (!entry.installed || !isReleased(getGame(entry.slug))) return null
  if (entry.pendingUpdate) return describeUpdate(entry, 'pending', entry.pendingUpdate.sizeGB)
  if ((entry.updatedWeek ?? 0) >= week) return null
  const h = hash(`${entry.slug}:${week}`)
  if (h % 5 >= 2) return null
  const game = getGame(entry.slug)
  const size = Math.min(0.3 + (h % 90) / 10, (game?.sizeGB ?? 4) * 0.25)
  return describeUpdate(entry, week, Math.max(0.1, Math.round(size * 10) / 10))
}
