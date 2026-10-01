'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { authorHue } from '@/lib/community'
import { bundlePrice, editionPrice, getBundle, getEdition, getGame } from '@/lib/games'
import { useToast } from '@/app/Components/UI/Toast'

const STORAGE_KEY = 'ultimate-launcher:v3'
const V2_KEY = 'ultimate-launcher:v2'
const LEGACY_KEYS = ['ultimate-launcher:v1', V2_KEY]
const DAY = 24 * 60 * 60 * 1000
// Stable empty list for signed-out users, so memoized values don't change every render.
const EMPTY = []

export const DEMO_USER = { username: 'demo', displayName: 'Demo Player' }

export const ACCENTS = {
  blue: { label: 'Blue', swatch: '#2e84ff' },
  purple: { label: 'Purple', swatch: '#8b5cf6' },
  green: { label: 'Green', swatch: '#22c55e' },
  orange: { label: 'Orange', swatch: '#f97316' },
  pink: { label: 'Pink', swatch: '#ec4899' },
}

// Simulated download speeds in GB per second.
export const CONNECTIONS = {
  turbo: { label: 'Demo turbo', description: 'Downloads finish in seconds, handy for trying the launcher out.', min: 3, max: 6 },
  gigabit: { label: '1 Gbps fiber', description: 'A fast home connection. A large game takes about 15 minutes.', min: 0.105, max: 0.118 },
  broadband: { label: '100 Mbps broadband', description: 'A typical connection. Large games take a few hours.', min: 0.0105, max: 0.0118 },
}

// Simulated download servers. `speed` is the share of your connection a region delivers; `ping` is shown for flavour.
export const REGIONS = {
  auto: { label: 'Auto-detect (recommended)', group: 'Automatic', ping: 12, speed: 1 },
  'eu-central': { label: 'Frankfurt', group: 'Europe', ping: 12, speed: 1 },
  'eu-west': { label: 'London', group: 'Europe', ping: 18, speed: 0.97 },
  'eu-north': { label: 'Stockholm', group: 'Europe', ping: 29, speed: 0.93 },
  'us-east': { label: 'US East (New York)', group: 'Americas', ping: 31, speed: 0.94 },
  'us-central': { label: 'US Central (Chicago)', group: 'Americas', ping: 47, speed: 0.91 },
  'us-west': { label: 'US West (Los Angeles)', group: 'Americas', ping: 68, speed: 0.88 },
  'sa-east': { label: 'South America (São Paulo)', group: 'Americas', ping: 196, speed: 0.62 },
  'me-central': { label: 'Middle East (Dubai)', group: 'Middle East & Africa', ping: 94, speed: 0.74 },
  'af-south': { label: 'Africa (Johannesburg)', group: 'Middle East & Africa', ping: 177, speed: 0.58 },
  'as-south': { label: 'India (Mumbai)', group: 'Asia & Pacific', ping: 133, speed: 0.66 },
  'as-sg': { label: 'Singapore', group: 'Asia & Pacific', ping: 148, speed: 0.72 },
  'as-jp': { label: 'Japan (Tokyo)', group: 'Asia & Pacific', ping: 162, speed: 0.7 },
  'as-kr': { label: 'South Korea (Seoul)', group: 'Asia & Pacific', ping: 171, speed: 0.68 },
  'oc-au': { label: 'Australia (Sydney)', group: 'Asia & Pacific', ping: 231, speed: 0.6 },
}

// Download speed caps, in GB per second (shown to people in MB/s).
export const BANDWIDTH_LIMITS = {
  none: { label: 'No limit', gbps: null },
  '1': { label: '1 MB/s', gbps: 1 / 1024 },
  '5': { label: '5 MB/s', gbps: 5 / 1024 },
  '10': { label: '10 MB/s', gbps: 10 / 1024 },
  '25': { label: '25 MB/s', gbps: 25 / 1024 },
  '50': { label: '50 MB/s', gbps: 50 / 1024 },
  '100': { label: '100 MB/s', gbps: 100 / 1024 },
}

export const AUTO_UPDATE_MODES = {
  always: { label: 'Always keep my games up to date', description: 'Updates download as soon as they are available.' },
  scheduled: { label: 'Only during the update window', description: 'Updates wait for the hours you choose below.' },
  manual: { label: 'Never, I will update games myself', description: 'Updates show up in your library and Downloads page.' },
}

export const DEFAULT_SETTINGS = {
  accent: 'blue',
  connection: 'turbo',
  autoInstall: false,
  region: 'auto',
  bandwidthLimit: 'none',
  showBits: false,
  // Downloads only run between start and end (local time) when enabled.
  schedule: { enabled: false, start: '01:00', end: '07:00' },
  autoUpdate: 'always',
  updateWindow: { start: '02:00', end: '06:00' },
}

// ---------- Simulated game updates ----------
// Installed games get an update now and then, decided deterministically per game and week so the
// Library, game pages and Downloads page always agree. No server involved.
const WEEK = 7 * DAY
export const currentWeek = () => Math.floor(Date.now() / WEEK)

function hashString(text) {
  let h = 2166136261
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  return h >>> 0
}

export function getUpdate(entry, week = currentWeek()) {
  if (!entry.installed || (entry.updatedWeek ?? 0) >= week) return null
  const h = hashString(`${entry.slug}:${week}`)
  if (h % 5 >= 2) return null
  const game = getGame(entry.slug)
  const size = Math.min(0.3 + (h % 90) / 10, (game?.sizeGB ?? 4) * 0.25)
  return { sizeGB: Math.max(0.1, Math.round(size * 10) / 10) }
}

function newAccount(displayName, overrides = {}) {
  return {
    profile: { displayName, bio: '', avatarHue: null, createdAt: Date.now(), ...overrides.profile },
    settings: { ...DEFAULT_SETTINGS },
    library: overrides.library ?? [],
    wishlist: overrides.wishlist ?? [],
  }
}

// The demo account comes with a few games so the library isn't empty in the showcase.
function demoAccount() {
  const now = Date.now()
  return newAccount(DEMO_USER.displayName, {
    profile: { bio: 'Here for the open worlds and the occasional boss fight.', createdAt: now - 400 * DAY },
    library: [
      { slug: 'the-witcher-3', edition: 'complete', purchasedAt: now - 120 * DAY, installed: true, playtimeMinutes: 2235, lastPlayed: now - 2 * DAY },
      { slug: 'devil-may-cry-5', edition: 'standard', purchasedAt: now - 60 * DAY, installed: true, playtimeMinutes: 640, lastPlayed: now - 9 * DAY },
      { slug: 'red-dead-redemption-2', edition: 'standard', purchasedAt: now - 14 * DAY, installed: false, playtimeMinutes: 0, lastPlayed: null },
    ],
    wishlist: [{ slug: 'god-of-war', addedAt: now - 5 * DAY }],
  })
}

const emptyCommunity = () => ({ reviews: {}, comments: {}, helpful: {} })

function initialState() {
  return { session: null, accounts: { [DEMO_USER.username]: demoAccount() }, cart: [], community: emptyCommunity() }
}

const knownGame = (entry) => entry && getGame(entry.slug)

function sanitizeAccount(account, username) {
  const fresh = newAccount(username)
  return {
    profile: { ...fresh.profile, ...account?.profile },
    settings: { ...DEFAULT_SETTINGS, ...account?.settings },
    library: (Array.isArray(account?.library) ? account.library : [])
      .filter(knownGame)
      .map((entry) => ({ edition: 'standard', ...entry })),
    wishlist: (Array.isArray(account?.wishlist) ? account.wishlist : []).filter(knownGame),
  }
}

function sanitizeCart(cart) {
  if (!Array.isArray(cart)) return []
  return cart.filter((item) => (item.type === 'bundle' ? getBundle(item.slug) : getGame(item.slug)))
}

// Data saved by the previous version (no profiles, editions or bundles).
function migrateV2(v2) {
  const accounts = {}
  for (const [username, account] of Object.entries(v2.accounts ?? {})) {
    const displayName = v2.session?.username === username ? v2.session.displayName : username
    accounts[username] = sanitizeAccount({ ...account, profile: { displayName } }, username)
  }
  if (!accounts[DEMO_USER.username]) accounts[DEMO_USER.username] = demoAccount()
  const cart = (v2.cart ?? []).map((entry) => ({ id: `game:${entry.slug}`, type: 'game', slug: entry.slug, edition: 'standard', addedAt: entry.addedAt }))
  return {
    session: v2.session && accounts[v2.session.username] ? { username: v2.session.username } : null,
    accounts,
    cart: sanitizeCart(cart),
    community: emptyCommunity(),
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const v2 = localStorage.getItem(V2_KEY)
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
      return v2 ? migrateV2(JSON.parse(v2)) : initialState()
    }
    const parsed = JSON.parse(raw)
    const accounts = {}
    for (const [username, account] of Object.entries(parsed.accounts ?? {})) {
      accounts[username] = sanitizeAccount(account, username)
    }
    return {
      session: parsed.session && accounts[parsed.session.username] ? { username: parsed.session.username } : null,
      accounts,
      cart: sanitizeCart(parsed.cart),
      community: { ...emptyCommunity(), ...parsed.community },
    }
  } catch {
    return initialState()
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const toast = useToast()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const [data, setData] = useState(initialState)

  // Actions read the latest state through refs so they never change identity.
  const dataRef = useRef(data)
  const pathRef = useRef(pathname)
  dataRef.current = data
  pathRef.current = pathname

  useEffect(() => {
    setData(loadState())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the session still works in memory.
    }
  }, [hydrated, data])

  const account = data.session ? data.accounts[data.session.username] : null
  const accent = account?.settings.accent ?? DEFAULT_SETTINGS.accent

  useEffect(() => {
    document.documentElement.dataset.accent = accent
  }, [accent])

  const actions = useMemo(() => {
    const accountOf = (d) => (d.session ? d.accounts[d.session.username] : null)
    const owned = (slug) => Boolean(accountOf(dataRef.current)?.library.some((entry) => entry.slug === slug))
    const username = () => dataRef.current.session?.username

    const updateAccount = (update) =>
      setData((d) => (d.session ? { ...d, accounts: { ...d.accounts, [d.session.username]: update(d.accounts[d.session.username]) } } : d))
    const updateEntry = (slug, changes) =>
      updateAccount((acc) => ({ ...acc, library: acc.library.map((entry) => (entry.slug === slug ? { ...entry, ...changes } : entry)) }))
    const updateCommunity = (update) => setData((d) => ({ ...d, community: update(d.community) }))
    const promptSignIn = (message) =>
      toast({ message, href: `/signin?next=${encodeURIComponent(pathRef.current)}`, actionLabel: 'Sign in' })

    return {
      signIn({ username: name, displayName }) {
        const key = name.trim().toLowerCase()
        const existing = dataRef.current.accounts[key]
        const acc = existing ?? (key === DEMO_USER.username ? demoAccount() : newAccount(displayName?.trim() || name.trim()))
        const ownedSlugs = new Set(acc.library.map((entry) => entry.slug))
        setData((d) => ({
          ...d,
          session: { username: key },
          accounts: { ...d.accounts, [key]: d.accounts[key] ?? acc },
          // Drop cart items the user already owns
          cart: d.cart.filter((item) =>
            item.type === 'game' ? !ownedSlugs.has(item.slug) : getBundle(item.slug).games.some((slug) => !ownedSlugs.has(slug))
          ),
        }))
        toast({ message: `Signed in as ${acc.profile.displayName}.` })
      },
      signOut() {
        setData((d) => ({ ...d, session: null }))
        toast({ message: 'You have been signed out.' })
      },
      deleteAccount() {
        const name = username()
        if (!name) return
        setData((d) => {
          const accounts = { ...d.accounts }
          delete accounts[name]
          const byOthers = (list) => list.filter((item) => item.author.username !== name)
          const reviews = Object.fromEntries(Object.entries(d.community.reviews).map(([slug, list]) => [slug, byOthers(list)]))
          const comments = Object.fromEntries(Object.entries(d.community.comments).map(([slug, list]) => [slug, byOthers(list)]))
          return { ...d, session: null, accounts, community: { ...d.community, reviews, comments } }
        })
        toast({ message: 'Your account was deleted.' })
      },
      updateProfile(changes) {
        updateAccount((acc) => ({ ...acc, profile: { ...acc.profile, ...changes } }))
        toast({ message: 'Profile saved.' })
      },
      updateSettings(changes) {
        updateAccount((acc) => ({ ...acc, settings: { ...acc.settings, ...changes } }))
      },

      addToCart(game, editionId = 'standard') {
        if (owned(game.slug)) return
        const coveredBy = dataRef.current.cart.find((item) => item.type === 'bundle' && getBundle(item.slug).games.includes(game.slug))
        if (coveredBy) {
          toast({ message: `${game.title} is already in your cart as part of ${getBundle(coveredBy.slug).title}.`, href: '/cart', actionLabel: 'View cart' })
          return
        }
        const edition = getEdition(game, editionId)
        setData((d) => ({
          ...d,
          cart: [
            ...d.cart.filter((item) => item.id !== `game:${game.slug}`),
            { id: `game:${game.slug}`, type: 'game', slug: game.slug, edition: edition.id, addedAt: Date.now() },
          ],
        }))
        const label = edition.id === 'standard' ? game.title : `${game.title} (${edition.name})`
        toast({ message: `${label} was added to your cart.`, href: '/cart', actionLabel: 'View cart' })
      },
      addBundleToCart(bundle) {
        if (bundlePrice(bundle, owned).games.length === 0) return
        setData((d) => ({
          ...d,
          cart: [
            // The bundle replaces any of its games already in the cart
            ...d.cart.filter((item) => !(item.type === 'game' && bundle.games.includes(item.slug)) && item.id !== `bundle:${bundle.slug}`),
            { id: `bundle:${bundle.slug}`, type: 'bundle', slug: bundle.slug, addedAt: Date.now() },
          ],
        }))
        toast({ message: `${bundle.title} was added to your cart.`, href: '/cart', actionLabel: 'View cart' })
      },
      removeFromCart(itemId) {
        setData((d) => ({ ...d, cart: d.cart.filter((item) => item.id !== itemId) }))
      },
      // Moves every cart item into the library. Returns { purchases, total }, or null when signed out.
      checkout() {
        const d = dataRef.current
        if (!d.session) return null
        const ownedSlugs = new Set(accountOf(d).library.map((entry) => entry.slug))
        const purchases = []
        let total = 0
        for (const item of d.cart) {
          if (item.type === 'game') {
            if (ownedSlugs.has(item.slug)) continue
            const game = getGame(item.slug)
            const edition = getEdition(game, item.edition)
            purchases.push({ game, edition })
            total += editionPrice(game, edition)
            ownedSlugs.add(item.slug)
          } else {
            const bundle = getBundle(item.slug)
            const price = bundlePrice(bundle, (slug) => ownedSlugs.has(slug))
            price.games.forEach((game) => {
              purchases.push({ game, edition: getEdition(game), bundle: bundle.title })
              ownedSlugs.add(game.slug)
            })
            total += price.price
          }
        }
        const now = Date.now()
        const bought = new Set(purchases.map((p) => p.game.slug))
        updateAccount((acc) => ({
          ...acc,
          library: [
            ...acc.library,
            ...purchases.map((p) => ({ slug: p.game.slug, edition: p.edition.id, purchasedAt: now, installed: false, playtimeMinutes: 0, lastPlayed: null })),
          ],
          wishlist: acc.wishlist.filter((entry) => !bought.has(entry.slug)),
        }))
        setData((current) => ({ ...current, cart: [] }))
        return { purchases, total: Math.round(total * 100) / 100 }
      },

      toggleWishlist(game) {
        const acc = accountOf(dataRef.current)
        if (!acc) return promptSignIn('Sign in to save games to your wishlist.')
        if (acc.wishlist.some((entry) => entry.slug === game.slug)) {
          updateAccount((a) => ({ ...a, wishlist: a.wishlist.filter((entry) => entry.slug !== game.slug) }))
          toast({ message: `Removed ${game.title} from your wishlist.` })
        } else {
          updateAccount((a) => ({ ...a, wishlist: [...a.wishlist, { slug: game.slug, addedAt: Date.now() }] }))
          toast({ message: `Added ${game.title} to your wishlist.`, href: '/wishlist', actionLabel: 'View wishlist' })
        }
      },

      markInstalled(slug) {
        updateEntry(slug, { installed: true, updatedWeek: currentWeek() })
      },
      markUpdated(slug) {
        updateEntry(slug, { updatedWeek: currentWeek() })
      },
      uninstall(game) {
        updateEntry(game.slug, { installed: false })
        toast({ message: `${game.title} was uninstalled.` })
      },
      play(game) {
        updateEntry(game.slug, { lastPlayed: Date.now() })
        toast({ message: `Launching ${game.title}…` })
      },

      submitReview(game, { recommended, text }) {
        const acc = accountOf(dataRef.current)
        if (!acc) return promptSignIn('Sign in to write a review.')
        const entry = acc.library.find((e) => e.slug === game.slug)
        if (!entry) return toast({ message: `Only players who own ${game.title} can review it.` })
        const name = username()
        const review = {
          id: `${name}-${game.slug}`,
          author: { username: name },
          recommended,
          text: text.trim(),
          hoursPlayed: Math.round(entry.playtimeMinutes / 60),
          createdAt: new Date().toISOString(),
        }
        updateCommunity((c) => ({
          ...c,
          reviews: { ...c.reviews, [game.slug]: [review, ...(c.reviews[game.slug] ?? []).filter((r) => r.author.username !== name)] },
        }))
        toast({ message: 'Thanks! Your review was posted.' })
      },
      deleteReview(game) {
        const name = username()
        updateCommunity((c) => ({
          ...c,
          reviews: { ...c.reviews, [game.slug]: (c.reviews[game.slug] ?? []).filter((r) => r.author.username !== name) },
        }))
        toast({ message: 'Your review was deleted.' })
      },
      toggleHelpful(reviewId) {
        const name = username()
        if (!name) return promptSignIn('Sign in to rate reviews.')
        updateCommunity((c) => {
          const voters = c.helpful[reviewId] ?? []
          const next = voters.includes(name) ? voters.filter((v) => v !== name) : [...voters, name]
          return { ...c, helpful: { ...c.helpful, [reviewId]: next } }
        })
      },
      addComment(game, text) {
        const name = username()
        if (!name) return promptSignIn('Sign in to join the discussion.')
        const comment = { id: `${name}-${Date.now()}`, author: { username: name }, text: text.trim(), createdAt: new Date().toISOString() }
        updateCommunity((c) => ({ ...c, comments: { ...c.comments, [game.slug]: [comment, ...(c.comments[game.slug] ?? [])] } }))
      },
      deleteComment(game, commentId) {
        updateCommunity((c) => ({
          ...c,
          comments: { ...c.comments, [game.slug]: (c.comments[game.slug] ?? []).filter((item) => item.id !== commentId) },
        }))
      },

      resetDemo() {
        setData(initialState())
        toast({ message: 'Demo data was reset and you were signed out.' })
      },
    }
  }, [toast])

  const value = useMemo(() => {
    const { session, accounts, cart, community } = data
    const acc = session ? accounts[session.username] : null
    const library = acc?.library ?? EMPTY
    const wishlist = acc?.wishlist ?? EMPTY
    const ownedSlugs = new Set(library.map((entry) => entry.slug))
    const wished = new Set(wishlist.map((entry) => entry.slug))

    // Public profile info for any account (used to show review/comment authors)
    const profileOf = (name) => {
      const p = accounts[name]?.profile
      return { username: name, displayName: p?.displayName ?? name, hue: p?.avatarHue ?? authorHue(name) }
    }

    return {
      hydrated,
      session,
      user: session ? profileOf(session.username) : null,
      profile: acc?.profile ?? null,
      settings: acc?.settings ?? DEFAULT_SETTINGS,
      library,
      wishlist,
      cart,
      community,
      profileOf,
      owns: (slug) => ownedSlugs.has(slug),
      isWishlisted: (slug) => wished.has(slug),
      getEntry: (slug) => library.find((entry) => entry.slug === slug),
      // The cart item that will buy `slug`: the game itself or a bundle containing it
      cartItemFor: (slug) =>
        cart.find((item) => (item.type === 'game' ? item.slug === slug : getBundle(item.slug).games.includes(slug))),
      ...actions,
    }
  }, [hydrated, data, actions])

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

export function formatRelative(timestamp) {
  const seconds = Math.round((timestamp - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return relative.format(seconds, 'second')
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < DAY / 1000) return relative.format(Math.round(seconds / 3600), 'hour')
  return relative.format(Math.round(seconds / 86400), 'day')
}

export function formatLastPlayed(timestamp) {
  if (!timestamp) return null
  const days = Math.round((timestamp - Date.now()) / DAY)
  if (days === 0) return 'Played today'
  return `Played ${relative.format(days, 'day')}`
}
