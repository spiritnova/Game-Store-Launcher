import { newlyUnlocked } from '@/lib/achievements'
import { getGame } from '@/lib/games'
import { formatMinutes } from '../format'
import { notification, pushNotification } from '../records'

// The running game's session: playtime is credited every few seconds, unlocking achievements.
// `ctx` holds the state setters, refs and helpers shared by all actions (built in index.js).
export function createPlaytime({ dataRef, playingRef, setPlaying, accountOf, updateAccount, toast, announceAchievements }) {
  function addPlaytime(slug, minutes) {
    const entry = accountOf(dataRef.current)?.library.find((e) => e.slug === slug)
    if (!entry || minutes <= 0) return
    const game = getGame(slug)
    const unlocked = newlyUnlocked(slug, entry.playtimeMinutes, entry.playtimeMinutes + minutes)
    const now = Date.now()
    updateAccount((acc) => {
      let next = {
        ...acc,
        library: acc.library.map((e) =>
          e.slug === slug
            ? { ...e, playtimeMinutes: e.playtimeMinutes + minutes, lastPlayed: now, achievements: { ...e.achievements, ...Object.fromEntries(unlocked.map((a) => [a.id, now])) } }
            : e
        ),
      }
      for (const a of unlocked) {
        next = pushNotification(next, notification('achievement', { slug, title: `Achievement unlocked: ${a.name}`, body: `${game.title} · ${a.description}`, href: `/games/${slug}#achievements` }))
      }
      return next
    })
    // Shown one at a time by the achievement pop-up
    if (unlocked.length > 0) announceAchievements(slug, unlocked)
  }

  // Credits the time played since the last commit; returns the session's total minutes.
  function commitPlaytime() {
    const session = playingRef.current
    if (!session) return 0
    const total = Math.floor(((Date.now() - session.startedAt) / 1000) * session.scale)
    const delta = total - session.credited
    if (delta > 0) {
      session.credited = total
      addPlaytime(session.slug, delta)
    }
    return total
  }

  function stopPlaying({ quiet = false } = {}) {
    const session = playingRef.current
    if (!session) return
    const minutes = commitPlaytime()
    playingRef.current = null
    setPlaying(null)
    if (!quiet) toast({ message: `Closed ${getGame(session.slug).title}. You played for ${minutes < 1 ? 'less than a minute' : formatMinutes(minutes)}.` })
  }

  return { addPlaytime, commitPlaytime, stopPlaying }
}
