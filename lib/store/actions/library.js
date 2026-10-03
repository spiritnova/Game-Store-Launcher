import { formatUnlockTime, getGame, isReleased, releaseTime } from '@/lib/games'
import { completeStep } from '../records'
import { DRIVES } from '../settings'
import { currentWeek, getUpdate } from '../updates'

export function libraryActions({ dataRef, toast, accountOf, updateAccount, updateEntry, playingRef, setPlaying, stopPlaying }) {
  return {
    // ---------- Library ----------
    markInstalled(slug) {
      const drive = accountOf(dataRef.current)?.settings.installDrive ?? 'c'
      // A fresh install is already up to date
      updateEntry(slug, { installed: true, updatedWeek: currentWeek(), pendingUpdate: null, drive })
      updateAccount((acc) => completeStep(acc, 'install'))
    },
    markUpdated(slug) {
      const entry = accountOf(dataRef.current)?.library.find((e) => e.slug === slug)
      const update = entry && getUpdate(entry)
      updateEntry(slug, { updatedWeek: currentWeek(), pendingUpdate: null, ...(update ? { version: update.version } : {}) })
    },
    uninstall(game) {
      if (playingRef.current?.slug === game.slug) stopPlaying({ quiet: true })
      updateEntry(game.slug, { installed: false })
      toast({ message: `${game.title} was uninstalled.` })
    },
    // Launches a game. Only one game runs at a time; playtime is added while it runs.
    play(game) {
      if (playingRef.current?.slug === game.slug) return
      if (!isReleased(game)) return toast({ message: `${game.title} unlocks on ${formatUnlockTime(releaseTime(game))}.` })
      if (playingRef.current) stopPlaying()
      const acc = accountOf(dataRef.current)
      if (!acc) return
      const session = { slug: game.slug, startedAt: Date.now(), scale: acc.settings.fastPlaytime ? 1 : 1 / 60, credited: 0 }
      playingRef.current = session
      setPlaying({ slug: session.slug, startedAt: session.startedAt, scale: session.scale })
      updateEntry(game.slug, { lastPlayed: Date.now() })
      toast({ message: `Launching ${game.title}…` })
    },
    stopPlaying() {
      stopPlaying()
    },
    toggleFavorite(slug) {
      const entry = accountOf(dataRef.current)?.library.find((e) => e.slug === slug)
      if (!entry) return
      updateEntry(slug, { favorite: !entry.favorite })
      toast({ message: entry.favorite ? `Removed ${getGame(slug).title} from favourites.` : `Added ${getGame(slug).title} to favourites.` })
    },
    toggleHidden(slug) {
      const entry = accountOf(dataRef.current)?.library.find((e) => e.slug === slug)
      if (!entry) return
      updateEntry(slug, { hidden: !entry.hidden })
      toast(entry.hidden ? { message: `${getGame(slug).title} is visible in your library again.` } : { message: `${getGame(slug).title} is hidden. Find it under Hidden in your library.` })
    },
    setLaunchOptions(slug, launchOptions) {
      updateEntry(slug, { launchOptions })
    },
    moveInstall(slug, drive) {
      updateEntry(slug, { drive })
      toast({ message: `${getGame(slug).title} was moved to ${DRIVES[drive].label}.` })
    },

    // ---------- Collections ----------
    createCollection(name, slug) {
      const id = `c-${Date.now().toString(36)}`
      updateAccount((acc) => ({ ...acc, collections: [...acc.collections, { id, name: name.trim(), slugs: slug ? [slug] : [] }] }))
      toast({ message: slug ? `Created “${name.trim()}” with ${getGame(slug).title}.` : `Created “${name.trim()}”.` })
      return id
    },
    renameCollection(id, name) {
      updateAccount((acc) => ({ ...acc, collections: acc.collections.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)) }))
    },
    deleteCollection(id) {
      const collection = accountOf(dataRef.current)?.collections.find((c) => c.id === id)
      updateAccount((acc) => ({ ...acc, collections: acc.collections.filter((c) => c.id !== id) }))
      if (collection) toast({ message: `Deleted “${collection.name}”. Its games are still in your library.` })
    },
    toggleCollection(id, slug) {
      const collection = accountOf(dataRef.current)?.collections.find((c) => c.id === id)
      if (!collection) return
      const has = collection.slugs.includes(slug)
      updateAccount((acc) => ({
        ...acc,
        collections: acc.collections.map((c) => (c.id === id ? { ...c, slugs: has ? c.slugs.filter((s) => s !== slug) : [...c.slugs, slug] } : c)),
      }))
      toast({ message: has ? `Removed ${getGame(slug).title} from “${collection.name}”.` : `Added ${getGame(slug).title} to “${collection.name}”.` })
    },

  }
}
