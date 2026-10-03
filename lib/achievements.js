// Sample achievements, generated deterministically per game (like the sample reviews) for every game
// whose store page lists achievements. Each one unlocks after a set amount of playtime, so a player's
// progress follows from the hours they have put in.
import { getGame } from '@/lib/games'
import { hash, random, shuffle } from '@/lib/random'

// [name, description, unlock time]: playtime milestones unlock exactly on time, story milestones around
// the given minute (varied per game), and achievements without a time unlock at a random point.
const general = [
  ['First Steps', 'Finish the opening chapter.', { story: 45 }],
  ['Getting Started', 'Complete the tutorial.', { story: 15 }],
  ['Warming Up', 'Play for an hour.', { exact: 60 }],
  ['Dedicated', 'Play for 10 hours.', { exact: 600 }],
  ['Devoted', 'Play for 50 hours.', { exact: 3000 }],
  ['Old Hand', 'Play for 100 hours.', { exact: 6000 }],
  ['Collector', 'Find 50 collectibles.'],
  ['Completionist', 'Unlock every other achievement.'],
  ['Explorer', 'Discover every region.'],
  ['Sharp Eye', 'Find a hidden secret.'],
  ['Fashionista', 'Change your look for the first time.'],
  ['Photographer', 'Take a picture in photo mode.'],
  ['Hoarder', 'Fill your inventory to the brim.'],
  ['Night Owl', 'Play past midnight.'],
  ['Halfway There', 'Reach the midpoint of the story.', { story: 900 }],
  ['The End?', 'Finish the main story.', { story: 1800 }],
  ['Encore', 'Start a second playthrough.', { story: 1900 }],
  ['Untouchable', 'Clear a stage without taking damage.'],
  ['Speed Demon', 'Finish a chapter in record time.'],
  ['Perfectionist', 'Earn the top grade on any challenge.'],
]

const byGenre = {
  Action: [['Combo Artist', 'Land a 50-hit combo.'], ['Giant Slayer', 'Defeat a boss on your first try.'], ['Unstoppable', 'Win 10 fights in a row.']],
  Adventure: [['Wanderer', 'Travel 100 km on foot.'], ['Puzzle Master', 'Solve every optional puzzle.'], ['Storyteller', 'Read every journal entry.']],
  RPG: [['Level Up', 'Reach level 10.'], ['Legend', 'Reach the level cap.'], ['Smooth Talker', 'Win an argument through dialogue.'], ['Alchemist', 'Craft 25 potions.']],
  Shooter: [['Marksman', 'Land 100 headshots.'], ['Locked and Loaded', 'Fully upgrade a weapon.'], ['Last One Standing', 'Win a round as the final survivor.']],
  Multiplayer: [['Team Player', 'Win 10 matches with friends.'], ['Rising Star', 'Reach rank 25.'], ['MVP', 'Finish a match at the top of the scoreboard.']],
  Horror: [['Survivor', 'Make it through the night.'], ['Nerves of Steel', 'Finish the game without hiding.'], ['Lights Out', 'Spend 10 minutes in total darkness.']],
  Strategy: [['Grand Plan', 'Win a campaign.'], ['Diplomat', 'Form three alliances.'], ['Empire Builder', 'Control 50 territories.']],
  Simulation: [['Tycoon', 'Earn your first million.'], ['Fully Booked', 'Max out your schedule.'], ['Master Planner', 'Build something huge.']],
  Racing: [['Podium Finish', 'Finish a race in the top three.'], ['Clean Racer', 'Win without touching a wall.'], ['Garage Full', 'Own 25 cars.']],
  Sports: [['Champion', 'Win a season title.'], ['Hat Trick', 'Score three times in one match.'], ['Comeback Kid', 'Win after being behind at half time.']],
  Fighting: [['Perfect Round', 'Win a round without taking a hit.'], ['Roster Pro', 'Win with every fighter.'], ['Arcade Legend', 'Clear arcade mode.']],
  Survival: [['Shelter', 'Build your first base.'], ['Well Fed', 'Cook 30 meals.'], ['Hundred Days', 'Survive 100 days.']],
  Platformer: [['Pixel Perfect', 'Clear a level without dying.'], ['Feather Light', 'Find every hidden collectible in a world.'], ['Air Time', 'Stay airborne for 10 seconds.']],
  Roguelike: [['One More Run', 'Start 50 runs.'], ['Lucky Streak', 'Win three runs in a row.'], ['Heat Seeker', 'Win on the hardest setting.']],
  Puzzle: [['Big Brain', 'Solve a puzzle without hints.'], ['Lateral Thinker', 'Find an alternative solution.']],
  'Open World': [['Cartographer', 'Uncover the whole map.'], ['Off the Beaten Path', 'Discover 25 points of interest.']],
  Casual: [['Social Butterfly', 'Play 20 rounds with friends.'], ['Party Starter', 'Host a game.']],
  Indie: [['Hidden Gem', 'Find the secret ending.']],
}

const cache = new Map()

export function hasAchievements(game) {
  return Boolean(game?.features?.includes('Achievements'))
}

// [{ id, name, description, minutes, percent }], sorted from easiest to hardest. Empty for games without achievements.
export function getAchievements(gameOrSlug) {
  const game = typeof gameOrSlug === 'string' ? getGame(gameOrSlug) : gameOrSlug
  if (!hasAchievements(game)) return []
  if (cache.has(game.slug)) return cache.get(game.slug)

  const rand = random(hash(`achievements:${game.slug}`))
  const themed = game.genres.flatMap((genre) => byGenre[genre] ?? [])
  const count = 12 + Math.floor(rand() * 13)
  // Themed achievements first, then a random selection of general ones
  const chosen = [...themed, ...shuffle(general, rand)].slice(0, count)

  const timed = chosen.map(([name, description, when], i) => {
    // Unlock times spread from minutes to about 40 hours, mostly early on
    const r = rand()
    let minutes = Math.round(5 + Math.pow(r, 2.2) * 2400)
    if (when?.exact) minutes = when.exact
    else if (when?.story) minutes = Math.round(when.story * (0.7 + r * 0.6))
    return { id: `${game.slug}-${i}`, name, description, minutes }
  })
  // A second playthrough starts after the ending, and "unlock every other achievement" comes last
  const ending = timed.find((a) => a.name === 'The End?')?.minutes ?? 0
  const ordered = timed.map((a) => (a.name === 'Encore' ? { ...a, minutes: Math.max(a.minutes, ending + 45) } : a))
  const last = Math.max(...ordered.filter((a) => a.name !== 'Completionist').map((a) => a.minutes))
  const list = ordered
    .map((a) => (a.name === 'Completionist' ? { ...a, minutes: last + 60 } : a))
    .sort((a, b) => a.minutes - b.minutes)
    .map((achievement, i, all) => ({
      ...achievement,
      // Global unlock rate falls as achievements get harder
      percent: Math.max(0.4, Math.round((92 - (i / all.length) * 85 + (rand() - 0.5) * 6) * 10) / 10),
    }))

  cache.set(game.slug, list)
  return list
}

// Unlock times for every achievement a library entry has earned through playtime.
// Earlier versions didn't store them, so achievements without a time use the last time the game was played.
export function unlockedAchievements(entry) {
  return getAchievements(entry.slug)
    .filter((a) => a.minutes <= entry.playtimeMinutes)
    .map((a) => ({ ...a, unlockedAt: entry.achievements?.[a.id] ?? entry.lastPlayed ?? entry.purchasedAt }))
}

// Achievements crossed when playtime goes from `before` to `after` minutes.
export function newlyUnlocked(slug, before, after) {
  return getAchievements(slug).filter((a) => a.minutes > before && a.minutes <= after)
}

// { unlocked, total, percent } for a library entry, or null when the game has no achievements.
export function achievementProgress(entry) {
  const total = getAchievements(entry.slug).length
  if (!total) return null
  const unlocked = getAchievements(entry.slug).filter((a) => a.minutes <= entry.playtimeMinutes).length
  return { unlocked, total, percent: Math.round((unlocked / total) * 100) }
}

export function rarity(percent) {
  if (percent < 5) return 'Ultra rare'
  if (percent < 15) return 'Very rare'
  if (percent < 35) return 'Rare'
  return null
}
