'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getGame } from '@/lib/games'
import { useToast } from '@/app/Components/UI/Toast'

const STORAGE_KEY = 'ultimate-launcher:v1'
const DAY = 24 * 60 * 60 * 1000

// First-visit demo data so the library isn't empty when someone opens the showcase.
function demoState() {
  const now = Date.now()
  return {
    library: [
      { slug: 'the-witcher-3', purchasedAt: now - 120 * DAY, installed: true, playtimeMinutes: 2235, lastPlayed: now - 2 * DAY },
      { slug: 'devil-may-cry-5', purchasedAt: now - 60 * DAY, installed: true, playtimeMinutes: 640, lastPlayed: now - 9 * DAY },
      { slug: 'red-dead-redemption-2', purchasedAt: now - 14 * DAY, installed: false, playtimeMinutes: 0, lastPlayed: null },
    ],
    wishlist: [{ slug: 'god-of-war', addedAt: now - 5 * DAY }],
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return demoState()
    const parsed = JSON.parse(raw)
    const known = (entry) => entry && getGame(entry.slug)
    return {
      library: Array.isArray(parsed.library) ? parsed.library.filter(known) : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist.filter(known) : [],
    }
  } catch {
    return demoState()
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const toast = useToast()
  const [hydrated, setHydrated] = useState(false)
  const [library, setLibrary] = useState([])
  const [wishlist, setWishlist] = useState([])
  // slug -> install progress (0-100). Not persisted: a reload cancels running installs.
  const [downloads, setDownloads] = useState({})

  useEffect(() => {
    const state = loadState()
    setLibrary(state.library)
    setWishlist(state.wishlist)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ library, wishlist }))
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the session still works in memory.
    }
  }, [hydrated, library, wishlist])

  const isDownloading = Object.keys(downloads).length > 0

  useEffect(() => {
    if (!isDownloading) return
    const timer = setInterval(() => {
      setDownloads((current) => {
        const next = {}
        for (const [slug, progress] of Object.entries(current)) {
          next[slug] = Math.min(100, progress + 3 + Math.random() * 5)
        }
        return next
      })
    }, 250)
    return () => clearInterval(timer)
  }, [isDownloading])

  useEffect(() => {
    const finished = Object.keys(downloads).filter((slug) => downloads[slug] >= 100)
    if (finished.length === 0) return
    setDownloads((current) => {
      const next = { ...current }
      finished.forEach((slug) => delete next[slug])
      return next
    })
    setLibrary((current) => current.map((entry) => (finished.includes(entry.slug) ? { ...entry, installed: true } : entry)))
    finished.forEach((slug) =>
      toast({ message: `${getGame(slug).title} is ready to play.`, href: '/library', actionLabel: 'Open library' })
    )
  }, [downloads, toast])

  const updateEntry = (slug, changes) =>
    setLibrary((current) => current.map((entry) => (entry.slug === slug ? { ...entry, ...changes } : entry)))

  const owns = useCallback((slug) => library.some((entry) => entry.slug === slug), [library])
  const isWishlisted = useCallback((slug) => wishlist.some((entry) => entry.slug === slug), [wishlist])

  const actions = {
    buy(game) {
      if (owns(game.slug)) return
      setLibrary((current) => [
        ...current,
        { slug: game.slug, purchasedAt: Date.now(), installed: false, playtimeMinutes: 0, lastPlayed: null },
      ])
      setWishlist((current) => current.filter((entry) => entry.slug !== game.slug))
      toast({ message: `${game.title} was added to your library.`, href: '/library', actionLabel: 'View library' })
    },
    toggleWishlist(game) {
      if (isWishlisted(game.slug)) {
        setWishlist((current) => current.filter((entry) => entry.slug !== game.slug))
        toast({ message: `Removed ${game.title} from your wishlist.` })
      } else {
        setWishlist((current) => [...current, { slug: game.slug, addedAt: Date.now() }])
        toast({ message: `Added ${game.title} to your wishlist.`, href: '/wishlist', actionLabel: 'View wishlist' })
      }
    },
    install(game) {
      setDownloads((current) => ({ ...current, [game.slug]: 0 }))
    },
    cancelInstall(game) {
      setDownloads((current) => {
        const next = { ...current }
        delete next[game.slug]
        return next
      })
    },
    uninstall(game) {
      updateEntry(game.slug, { installed: false })
      toast({ message: `${game.title} was uninstalled.` })
    },
    play(game) {
      updateEntry(game.slug, { lastPlayed: Date.now() })
      toast({ message: `Launching ${game.title}…` })
    },
    resetDemo() {
      const state = demoState()
      setDownloads({})
      setLibrary(state.library)
      setWishlist(state.wishlist)
      toast({ message: 'Demo data was reset.' })
    },
  }

  const value = {
    hydrated,
    library,
    wishlist,
    downloads,
    owns,
    isWishlisted,
    getEntry: (slug) => library.find((entry) => entry.slug === slug),
    ...actions,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}

// Shared helpers for library views.
export function formatPlaytime(minutes) {
  if (!minutes) return 'Never played'
  if (minutes < 60) return `${minutes} min played`
  return `${Math.round(minutes / 60)} h played`
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatLastPlayed(timestamp) {
  if (!timestamp) return null
  const days = Math.round((timestamp - Date.now()) / DAY)
  if (days === 0) return 'Played today'
  return `Played ${relative.format(days, 'day')}`
}
