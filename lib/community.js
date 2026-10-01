// Sample reviews and comments from fictional demo players, generated deterministically per game
// so every visitor (and the server render) sees the same content.

const authors = [
  'PixelNomad', 'QuietStorm', 'LunaByte', 'RetroFox', 'NightOwl_92', 'KaiPlays', 'ByteKnight', 'MossyRock',
  'ZeroLag', 'SunnyDev', 'GhostPepper', 'IronMaple', 'CobaltCat', 'VelvetRook', 'TurboTaco', 'FrostLeaf',
]

const positive = [
  'Picked this up on sale and lost my whole weekend to it. Looks incredible and runs smoothly on my mid-range PC.',
  'One of the best {genre} games I have played in years. The pacing is great and it never felt like a chore.',
  'Came for the hype, stayed for the world. Every corner has something worth finding.',
  'Performance was rough at launch for me, but after a couple of patches it is rock solid. Easy recommendation now.',
  'The soundtrack alone is worth the price. Played with headphones the whole way through.',
  'Great with a controller. I switched from keyboard and mouse after an hour and never looked back.',
  'Finished it and immediately started a second run. That says it all.',
  'Gorgeous, polished and surprisingly emotional. I did not expect to care this much about the characters.',
  'If you are unsure, wait for a sale, but at this price it is a steal.',
  'My go-to game after work. Easy to jump in for half an hour, hard to put down.',
]

const negative = [
  'Fun when it works, but I have had a few crashes to desktop. Hoping for more patches.',
  'Looks great, but the opening hours drag. It took me a long time to get hooked.',
  'Not my kind of game in the end. Solid production, but the core loop did not click for me.',
  'Too many menus and unlocks for my taste. The moment-to-moment gameplay is good though.',
]

const comments = [
  'Anyone know how well this runs on a handheld PC?',
  'Just grabbed it in the sale. Any tips before I start?',
  'Playing on ultra with a 3070 and it holds a steady 60 fps.',
  'Took me three tries to get past the second big fight. Worth it.',
  'Photo mode in this game is criminally underrated.',
  'Does anyone else get stuttering after alt-tabbing? Restarting the game fixed it for me.',
  'First playthrough done. What a ride.',
  'Bought it for my brother and now I am the one playing it every night.',
  'The attention to detail in the environments is unreal.',
  'Worth playing with subtitles on, a lot of the dialogue is easy to miss.',
]

const multiplayerComments = [
  'Looking for people to squad up with this weekend, add me!',
  'Matchmaking is quick in the evenings, even on EU servers.',
]

function hash(text) {
  let h = 2166136261
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  return h >>> 0
}

// Small seeded PRNG (mulberry32)
function random(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(rand, list, count) {
  const pool = [...list]
  const chosen = []
  while (chosen.length < count && pool.length) chosen.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
  return chosen
}

const START = Date.UTC(2025, 5, 1)
const END = Date.UTC(2026, 8, 25)
const dateBetween = (rand) => new Date(START + rand() * (END - START)).toISOString()

export function authorHue(username) {
  return hash(username) % 360
}

export function getSeedReviews(game) {
  const rand = random(hash(`reviews:${game.slug}`))
  const count = 4 + Math.floor(rand() * 3)
  const names = pick(rand, authors, count)
  const positives = pick(rand, positive, count)
  const negatives = pick(rand, negative, count)

  return names
    .map((name, i) => {
      const recommended = rand() < 0.82
      const pool = recommended ? positives : negatives
      const text = pool[i % pool.length].replace('{genre}', game.genres[0].toLowerCase())
      return {
        id: `seed-${game.slug}-r${i}`,
        author: { username: name.toLowerCase(), displayName: name },
        recommended,
        hoursPlayed: Math.round(4 + rand() * 140),
        createdAt: dateBetween(rand),
        text,
        baseHelpful: Math.floor(rand() * 60),
        seeded: true,
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getSeedComments(game, multiplayer = false) {
  const rand = random(hash(`comments:${game.slug}`))
  const count = 3 + Math.floor(rand() * 3)
  const names = pick(rand, authors, count)
  const texts = pick(rand, multiplayer ? [...comments, ...multiplayerComments] : comments, count)

  return names
    .map((name, i) => ({
      id: `seed-${game.slug}-c${i}`,
      author: { username: name.toLowerCase(), displayName: name },
      createdAt: dateBetween(rand),
      text: texts[i],
      seeded: true,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// Steam-style summary label for a set of reviews.
export function reviewSummary(reviews) {
  const total = reviews.length
  if (total === 0) return { label: 'No reviews yet', percent: null, total, tone: 'neutral' }
  const percent = Math.round((reviews.filter((r) => r.recommended).length / total) * 100)
  if (percent >= 95) return { label: 'Overwhelmingly Positive', percent, total, tone: 'positive' }
  if (percent >= 80) return { label: 'Very Positive', percent, total, tone: 'positive' }
  if (percent >= 70) return { label: 'Mostly Positive', percent, total, tone: 'positive' }
  if (percent >= 40) return { label: 'Mixed', percent, total, tone: 'mixed' }
  if (percent >= 20) return { label: 'Mostly Negative', percent, total, tone: 'negative' }
  return { label: 'Negative', percent, total, tone: 'negative' }
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}
