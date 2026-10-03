// Fictional demo players (the authors of the sample reviews and comments). Each one gets a profile,
// a library and an online status, generated deterministically so they behave like real friends would.
import { allGames } from '@/lib/games'
import { authorHue, authors, hasSampleContent } from '@/lib/community'
import { hash, pick, random } from '@/lib/random'

const DAY = 24 * 60 * 60 * 1000
const ownable = allGames.filter(hasSampleContent)
const BIOS = [
  'Co-op enjoyer. Always down for a late-night session.',
  'Completionist. If there is a collectible, I will find it.',
  'Mostly shooters, occasionally a cozy farm game to calm down.',
  'Speedrunning a few platformers, badly.',
  'Strategy nerd. One more turn, every night.',
  'Here for the stories. Will cry at cutscenes.',
  'Racing sims on weekends, roguelikes on weekdays.',
  'Retired raid leader, now just vibing.',
  'Collecting achievements like they are going out of style.',
  'Horror games with the lights off only.',
]

export const DEMO_PLAYERS = authors.map((name) => {
  const username = name.toLowerCase()
  const rand = random(hash(`player:${username}`))
  const games = pick(rand, ownable, 8 + Math.floor(rand() * 10))
  const library = games
    .map((game) => ({
      slug: game.slug,
      playtimeMinutes: Math.round(Math.pow(rand(), 1.8) * 9000) + 30,
      lastPlayedDaysAgo: Math.floor(rand() * 90),
    }))
    .sort((a, b) => a.lastPlayedDaysAgo - b.lastPlayedDaysAgo)
  return {
    username,
    displayName: name,
    hue: authorHue(username),
    bio: BIOS[Math.floor(rand() * BIOS.length)],
    memberSinceDaysAgo: 200 + Math.floor(rand() * 2400),
    library,
    demo: true,
  }
})

const byUsername = new Map(DEMO_PLAYERS.map((player) => [player.username, player]))

export function getPlayer(username) {
  return byUsername.get(username?.toLowerCase()) ?? null
}

export function playerOwns(username, slug) {
  return Boolean(getPlayer(username)?.library.some((entry) => entry.slug === slug))
}

// Library entries in the same shape as an account's library, with dates relative to `now`.
export function playerLibrary(player, now = Date.now()) {
  return player.library.map((entry) => ({
    slug: entry.slug,
    playtimeMinutes: entry.playtimeMinutes,
    lastPlayed: now - entry.lastPlayedDaysAgo * DAY,
    purchasedAt: now - (entry.lastPlayedDaysAgo + 30) * DAY,
  }))
}

// Online status changes every 20 minutes: offline, online, away, or playing one of their games.
// Call it from client components only (after hydration), since it depends on the current time.
export function presence(username, now = Date.now()) {
  const player = getPlayer(username)
  if (!player) return { state: 'offline' }
  const slot = Math.floor(now / (20 * 60 * 1000))
  const roll = hash(`${username}:${slot}`) % 100
  if (roll < 40) return { state: 'offline', lastOnline: now - ((roll % 12) + 1) * 60 * 60 * 1000 }
  if (roll < 55) return { state: 'away' }
  if (roll < 70) return { state: 'online' }
  const recent = player.library.slice(0, 4)
  return { state: 'playing', slug: recent[roll % recent.length].slug }
}
