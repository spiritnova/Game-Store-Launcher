'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from '@/lib/games'
import { BANDWIDTH_LIMITS, CONNECTIONS, REGIONS, currentWeek, getUpdate, useStore } from '@/lib/store'
import { useToast } from '@/app/Components/UI/Toast'

// Download state lives in its own context: it changes twice a second while something downloads,
// and only download UI should re-render for that.
//
// Like Steam, the first item in the queue is "the current download". Pausing it keeps it on top
// (as Paused) and holds the whole queue until it is resumed, so nothing jumps to "Up next".
const STORAGE_KEY = 'ultimate-launcher:downloads:v1'
const TICK_MS = 500
const SAMPLES = 60
const EMPTY = { queue: [], history: [], skipped: {} }

const DownloadsContext = createContext(null)

// ---------- Time windows (local time, "HH:MM") ----------
const minutesOf = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function inWindow(window, date = new Date()) {
  const start = minutesOf(window.start)
  const end = minutesOf(window.end)
  const now = date.getHours() * 60 + date.getMinutes()
  if (start === end) return true
  return start < end ? now >= start && now < end : now >= start || now < end
}

function secondsUntil(time, date = new Date()) {
  const target = new Date(date)
  const [h, m] = time.split(':').map(Number)
  target.setHours(h, m, 0, 0)
  if (target <= date) target.setDate(target.getDate() + 1)
  return (target - date) / 1000
}

// Only the head of the queue can be paused; everything behind it simply waits.
const normalize = (queue) => queue.map((item, i) => (i > 0 && item.paused ? { ...item, paused: false } : item))

function sanitize(state) {
  const items = (list) => (Array.isArray(list) ? list.filter((item) => getGame(item.slug)) : [])
  return {
    queue: normalize(
      items(state?.queue).map((item) => ({
        slug: item.slug,
        kind: item.kind === 'update' ? 'update' : 'install',
        sizeGB: item.sizeGB ?? getGame(item.slug).sizeGB,
        downloadedGB: item.downloadedGB ?? 0,
        paused: Boolean(item.paused),
      }))
    ),
    history: items(state?.history).map((item) => ({ kind: 'install', ...item })),
    skipped: state?.skipped ?? {},
  }
}

export function DownloadsProvider({ children }) {
  const toast = useToast()
  const { hydrated: storeReady, session, settings, library, markInstalled, markUpdated, owns } = useStore()
  const user = session?.username ?? null
  const connection = CONNECTIONS[settings.connection] ?? CONNECTIONS.turbo
  const region = REGIONS[settings.region] ?? REGIONS.auto
  const limit = BANDWIDTH_LIMITS[settings.bandwidthLimit]?.gbps ?? null

  // { [username]: { queue: [{ slug, kind, sizeGB, downloadedGB, paused }], history: [...], skipped: { slug: week } } }
  const [all, setAll] = useState({})
  const [hydrated, setHydrated] = useState(false)
  const [samples, setSamples] = useState([])
  const [ignoreSchedule, setIgnoreSchedule] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const allRef = useRef(all)
  const userRef = useRef(user)
  const libraryRef = useRef(library)
  allRef.current = all
  userRef.current = user
  libraryRef.current = library

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      setAll(Object.fromEntries(Object.entries(parsed).map(([name, state]) => [name, sanitize(state)])))
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

  // Clock for schedule windows
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  const mine = (user && all[user]) || EMPTY
  // Only games the user owns (a deleted and re-created account must not inherit an old queue)
  const queue = useMemo(() => mine.queue.filter((item) => owns(item.slug)), [mine, owns])
  const current = queue[0] ?? null

  const nowDate = new Date(now)
  const schedule = settings.schedule
  const scheduleBlocked = Boolean(schedule.enabled && !ignoreSchedule && !inWindow(schedule, nowDate))
  const running = Boolean(current && !current.paused && !scheduleBlocked)
  const runningSlug = running ? current.slug : null

  const updateMine = useMemo(
    () => (update) => {
      const name = userRef.current
      if (!name) return
      setAll((state) => {
        const next = update(state[name] ?? EMPTY)
        return { ...state, [name]: { ...next, queue: normalize(next.queue) } }
      })
    },
    []
  )

  // The schedule override only lasts for the current queue
  const hasCurrent = Boolean(current)
  useEffect(() => {
    if (!hasCurrent) {
      setIgnoreSchedule(false)
      setSamples([])
    }
  }, [hasCurrent])

  // The simulated network: a random walk inside the connection's speed range, scaled by the
  // chosen region and capped by the bandwidth limit.
  const speedRef = useRef(null)
  useEffect(() => {
    if (!runningSlug) {
      speedRef.current = null
      return
    }
    const timer = setInterval(() => {
      const range = connection.max - connection.min
      const last = speedRef.current ?? connection.min + range / 2
      const raw = Math.min(connection.max, Math.max(connection.min, last + (Math.random() - 0.5) * range * 0.4))
      speedRef.current = raw
      let speed = raw * region.speed
      if (limit) speed = Math.min(speed, limit * (0.96 + Math.random() * 0.04))
      setSamples((s) => [...s.slice(-(SAMPLES - 1)), speed])

      const item = allRef.current[userRef.current]?.queue[0]
      if (!item || item.slug !== runningSlug) return
      const game = getGame(item.slug)
      const downloaded = item.downloadedGB + speed * (TICK_MS / 1000)

      if (downloaded >= item.sizeGB) {
        updateMine((s) => ({
          ...s,
          queue: s.queue.filter((q) => q.slug !== item.slug),
          history: [{ slug: item.slug, kind: item.kind, sizeGB: item.sizeGB, finishedAt: Date.now() }, ...s.history].slice(0, 20),
        }))
        if (item.kind === 'update') {
          markUpdated(item.slug)
          toast({ message: `${game.title} was updated.` })
        } else {
          markInstalled(item.slug)
          toast({ message: `${game.title} is ready to play.`, href: '/library', actionLabel: 'Open library' })
        }
      } else {
        updateMine((s) => ({ ...s, queue: s.queue.map((q) => (q.slug === item.slug ? { ...q, downloadedGB: downloaded } : q)) }))
      }
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [runningSlug, connection, region, limit, markInstalled, markUpdated, toast, updateMine])

  // Available updates for installed games (minus any already in the queue)
  const updates = useMemo(() => {
    const queued = new Set(queue.map((item) => item.slug))
    return library
      .filter((entry) => entry.installed && !queued.has(entry.slug))
      .map((entry) => ({ slug: entry.slug, ...getUpdate(entry) }))
      .filter((update) => update.sizeGB)
  }, [library, queue])

  // Auto-update: queue updates when the setting (and update window) allows it
  const minute = Math.floor(now / 60000)
  useEffect(() => {
    if (!hydrated || !storeReady || !user || updates.length === 0) return
    const mode = settings.autoUpdate
    const allowed = mode === 'always' || (mode === 'scheduled' && inWindow(settings.updateWindow, new Date(minute * 60000)))
    if (!allowed) return
    const skipped = allRef.current[user]?.skipped ?? {}
    const week = currentWeek()
    const pending = updates.filter((update) => skipped[update.slug] !== week)
    if (pending.length === 0) return
    updateMine((s) => ({
      ...s,
      queue: [
        ...s.queue,
        ...pending
          .filter((p) => !s.queue.some((q) => q.slug === p.slug))
          .map((p) => ({ slug: p.slug, kind: 'update', sizeGB: p.sizeGB, downloadedGB: 0, paused: false })),
      ],
    }))
    toast({
      message: pending.length === 1 ? `Updating ${getGame(pending[0].slug).title} automatically.` : `${pending.length} game updates were queued automatically.`,
      href: '/downloads',
      actionLabel: 'View downloads',
    })
  }, [hydrated, storeReady, user, updates, settings.autoUpdate, settings.updateWindow, minute, toast, updateMine])

  const actions = useMemo(
    () => ({
      install(game) {
        const state = allRef.current[userRef.current] ?? EMPTY
        if (state.queue.some((q) => q.slug === game.slug)) return
        const busy = state.queue.length > 0
        updateMine((s) => ({ ...s, queue: [...s.queue, { slug: game.slug, kind: 'install', sizeGB: game.sizeGB, downloadedGB: 0, paused: false }] }))
        if (busy) toast({ message: `${game.title} was added to your download queue.`, href: '/downloads', actionLabel: 'View downloads' })
      },
      queueUpdate(slug) {
        const entry = libraryRef.current.find((e) => e.slug === slug)
        const update = entry && getUpdate(entry)
        const state = allRef.current[userRef.current] ?? EMPTY
        if (!update || state.queue.some((q) => q.slug === slug)) return
        updateMine((s) => ({ ...s, queue: [...s.queue, { slug, kind: 'update', sizeGB: update.sizeGB, downloadedGB: 0, paused: false }] }))
      },
      updateAll() {
        const state = allRef.current[userRef.current] ?? EMPTY
        const queued = new Set(state.queue.map((q) => q.slug))
        const pending = libraryRef.current
          .filter((entry) => entry.installed && !queued.has(entry.slug))
          .map((entry) => ({ slug: entry.slug, update: getUpdate(entry) }))
          .filter((p) => p.update)
        if (pending.length === 0) return
        updateMine((s) => ({
          ...s,
          queue: [...s.queue, ...pending.map((p) => ({ slug: p.slug, kind: 'update', sizeGB: p.update.sizeGB, downloadedGB: 0, paused: false }))],
        }))
      },
      pause(slug) {
        updateMine((s) => ({ ...s, queue: s.queue.map((q) => (q.slug === slug ? { ...q, paused: true } : q)) }))
      },
      // Resuming (or "download now") moves an item to the front of the queue and starts it
      resume(slug) {
        updateMine((s) => {
          const item = s.queue.find((q) => q.slug === slug)
          return item ? { ...s, queue: [{ ...item, paused: false }, ...s.queue.filter((q) => q.slug !== slug)] } : s
        })
      },
      moveUp(slug) {
        updateMine((s) => {
          const index = s.queue.findIndex((q) => q.slug === slug)
          if (index <= 1) return s // the current download stays on top
          const queue = [...s.queue]
          ;[queue[index - 1], queue[index]] = [queue[index], queue[index - 1]]
          return { ...s, queue }
        })
      },
      cancel(slug) {
        updateMine((s) => {
          const item = s.queue.find((q) => q.slug === slug)
          // Cancelling an update means "not this week": auto-update won't queue it again straight away
          const skipped = item?.kind === 'update' ? { ...s.skipped, [slug]: currentWeek() } : s.skipped
          return { ...s, skipped, queue: s.queue.filter((q) => q.slug !== slug) }
        })
      },
      startNow() {
        setIgnoreSchedule(true)
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
      const index = queue.findIndex((q) => q.slug === slug)
      if (index < 0) return null
      const item = queue[index]
      let status = 'queued'
      if (index === 0) status = item.paused ? 'paused' : scheduleBlocked ? 'scheduled' : 'downloading'
      return { status, kind: item.kind, downloadedGB: item.downloadedGB, sizeGB: item.sizeGB, progress: (item.downloadedGB / item.sizeGB) * 100 }
    }
    return {
      hydrated,
      queue,
      // The first item in the queue, whether it is downloading, paused or waiting for its schedule
      current,
      running,
      history: mine.history,
      samples,
      speed: running ? samples.at(-1) ?? 0 : 0,
      region,
      schedule: {
        enabled: schedule.enabled,
        blocked: scheduleBlocked,
        window: schedule,
        startsInSeconds: schedule.enabled ? secondsUntil(schedule.start, new Date(now)) : null,
      },
      updates,
      updateFor: (slug) => updates.find((update) => update.slug === slug) ?? null,
      statusOf,
      ...actions,
    }
  }, [hydrated, queue, current, running, mine.history, samples, region, schedule, scheduleBlocked, now, updates, actions])

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>
}

export function useDownloads() {
  const downloads = useContext(DownloadsContext)
  if (!downloads) throw new Error('useDownloads must be used inside <DownloadsProvider>')
  return downloads
}

export function statusLabel(download) {
  if (download.status === 'paused') return 'Paused'
  if (download.status === 'scheduled') return 'Scheduled'
  if (download.status === 'queued') return 'Queued'
  return download.kind === 'update' ? 'Updating' : 'Downloading'
}

export function formatSpeed(gbPerSecond, bits = false) {
  if (bits) {
    const mbps = gbPerSecond * 1024 * 8
    return mbps >= 1000 ? `${(mbps / 1000).toFixed(2)} Gbps` : `${mbps.toFixed(1)} Mbps`
  }
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
