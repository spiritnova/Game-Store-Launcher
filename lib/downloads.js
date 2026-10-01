'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from '@/lib/games'
import { CONNECTIONS, useStore } from '@/lib/store'
import { useToast } from '@/app/Components/UI/Toast'

// Download state lives in its own context: it changes twice a second while something downloads,
// and only download UI should re-render for that.
const STORAGE_KEY = 'ultimate-launcher:downloads:v1'
const TICK_MS = 500
const SAMPLES = 60
const EMPTY = { queue: [], history: [] }

const DownloadsContext = createContext(null)

export function DownloadsProvider({ children }) {
  const toast = useToast()
  const { session, settings, markInstalled, owns } = useStore()
  const user = session?.username ?? null
  const connection = CONNECTIONS[settings.connection] ?? CONNECTIONS.turbo

  // { [username]: { queue: [{ slug, downloadedGB, paused }], history: [{ slug, sizeGB, finishedAt }] } }
  const [all, setAll] = useState({})
  const [hydrated, setHydrated] = useState(false)
  const [samples, setSamples] = useState([])
  const allRef = useRef(all)
  const userRef = useRef(user)
  allRef.current = all
  userRef.current = user

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      const clean = {}
      for (const [name, state] of Object.entries(parsed)) {
        clean[name] = {
          queue: (state.queue ?? []).filter((item) => getGame(item.slug)),
          history: (state.history ?? []).filter((item) => getGame(item.slug)),
        }
      }
      setAll(clean)
    } catch {
      // Ignore unreadable storage and start empty
    }
    setHydrated(true)
  }, [])

  // Persist at most once a second while downloading, and right away when the page is closed or reloaded
  useEffect(() => {
    if (!hydrated) return
    const save = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allRef.current))
      } catch {
        // Storage unavailable: downloads still work for this session
      }
    }
    const timer = setTimeout(save, 1000)
    window.addEventListener('pagehide', save)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pagehide', save)
    }
  }, [hydrated, all])

  const mine = (user && all[user]) || EMPTY
  // Only games the user owns (a deleted and re-created account must not inherit an old queue)
  const queue = useMemo(() => mine.queue.filter((item) => owns(item.slug)), [mine, owns])
  const active = queue.find((item) => !item.paused) ?? null
  const activeSlug = active?.slug

  const updateMine = useCallback((update) => {
    const name = userRef.current
    if (!name) return
    setAll((current) => ({ ...current, [name]: update(current[name] ?? EMPTY) }))
  }, [])

  // The simulated network: a random walk inside the connection's speed range.
  const speedRef = useRef(null)
  useEffect(() => {
    if (!activeSlug) {
      speedRef.current = null
      setSamples([])
      return
    }
    const timer = setInterval(() => {
      const range = connection.max - connection.min
      const last = speedRef.current ?? connection.min + range / 2
      const speed = Math.min(connection.max, Math.max(connection.min, last + (Math.random() - 0.5) * range * 0.4))
      speedRef.current = speed
      setSamples((s) => [...s.slice(-(SAMPLES - 1)), speed])

      const state = allRef.current[userRef.current]
      const item = state?.queue.find((q) => q.slug === activeSlug)
      if (!item) return
      const game = getGame(item.slug)
      const downloaded = item.downloadedGB + speed * (TICK_MS / 1000)

      if (downloaded >= game.sizeGB) {
        updateMine((s) => ({
          queue: s.queue.filter((q) => q.slug !== item.slug),
          history: [{ slug: item.slug, sizeGB: game.sizeGB, finishedAt: Date.now() }, ...s.history].slice(0, 20),
        }))
        markInstalled(item.slug)
        toast({ message: `${game.title} is ready to play.`, href: '/library', actionLabel: 'Open library' })
      } else {
        updateMine((s) => ({ ...s, queue: s.queue.map((q) => (q.slug === item.slug ? { ...q, downloadedGB: downloaded } : q)) }))
      }
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [activeSlug, connection, markInstalled, toast, updateMine])

  const actions = useMemo(
    () => ({
      install(game) {
        const state = allRef.current[userRef.current] ?? EMPTY
        if (state.queue.some((q) => q.slug === game.slug)) return
        const queued = state.queue.some((q) => !q.paused)
        updateMine((s) => ({ ...s, queue: [...s.queue, { slug: game.slug, downloadedGB: 0, paused: false }] }))
        if (queued) toast({ message: `${game.title} was added to your download queue.`, href: '/downloads', actionLabel: 'View downloads' })
      },
      pause(slug) {
        updateMine((s) => ({ ...s, queue: s.queue.map((q) => (q.slug === slug ? { ...q, paused: true } : q)) }))
      },
      resume(slug) {
        updateMine((s) => ({ ...s, queue: s.queue.map((q) => (q.slug === slug ? { ...q, paused: false } : q)) }))
      },
      // Moves an item to the front of the queue and starts it
      prioritize(slug) {
        updateMine((s) => {
          const item = s.queue.find((q) => q.slug === slug)
          return { ...s, queue: [{ ...item, paused: false }, ...s.queue.filter((q) => q.slug !== slug)] }
        })
      },
      moveUp(slug) {
        updateMine((s) => {
          const index = s.queue.findIndex((q) => q.slug === slug)
          if (index <= 0) return s
          const queue = [...s.queue]
          ;[queue[index - 1], queue[index]] = [queue[index], queue[index - 1]]
          return { ...s, queue }
        })
      },
      cancel(slug) {
        updateMine((s) => ({ ...s, queue: s.queue.filter((q) => q.slug !== slug) }))
      },
      clearHistory() {
        updateMine((s) => ({ ...s, history: [] }))
      },
      reset() {
        setAll({})
      },
    }),
    [toast, updateMine]
  )

  const value = useMemo(() => {
    const statusOf = (slug) => {
      const item = queue.find((q) => q.slug === slug)
      if (!item) return null
      const sizeGB = getGame(slug).sizeGB
      const status = item === active ? 'downloading' : item.paused ? 'paused' : 'queued'
      return { status, downloadedGB: item.downloadedGB, sizeGB, progress: (item.downloadedGB / sizeGB) * 100 }
    }
    return {
      hydrated,
      queue,
      history: mine.history,
      active,
      samples,
      speed: samples.at(-1) ?? 0,
      statusOf,
      ...actions,
    }
  }, [hydrated, mine, queue, active, samples, actions])

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>
}

export function useDownloads() {
  const downloads = useContext(DownloadsContext)
  if (!downloads) throw new Error('useDownloads must be used inside <DownloadsProvider>')
  return downloads
}

export function formatSpeed(gbPerSecond) {
  if (gbPerSecond >= 1) return `${gbPerSecond.toFixed(1)} GB/s`
  return `${(gbPerSecond * 1024).toFixed(1)} MB/s`
}

export function formatEta(seconds) {
  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} s`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.ceil((seconds % 3600) / 60)
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`
}
