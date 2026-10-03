'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { otherIn, threadId } from '@/lib/chat'
import { authorHue } from '@/lib/community'
import { formatMoney, formatPrice } from '@/lib/currency'
import { getBundle } from '@/lib/games'
import { getPlayer } from '@/lib/players'
import { STORAGE_KEY } from '@/lib/storage-key'
import { useToast } from '@/app/Components/UI/Toast'
import { accountActions } from './actions/account'
import { libraryActions } from './actions/library'
import { messageActions } from './actions/messages'
import { createPlaytime } from './actions/playtime'
import { shopActions } from './actions/shop'
import { socialActions } from './actions/social'
import { ownedDlc, priceCart, refundCheck } from './commerce'
import { completeStep } from './records'
import { DEFAULT_SETTINGS } from './settings'
import { initialState, loadState } from './state'

export * from './settings'
export * from './format'
export { currentWeek, getUpdate, installedVersion } from './updates'
export { ownedDlc } from './commerce'

// Stable empty list for signed-out users, so memoized values don't change every render.
const EMPTY = []

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const toast = useToast()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const [data, setData] = useState(initialState)
  // The game being played right now: { slug, startedAt, scale } (minutes of playtime per real second)
  const [playing, setPlaying] = useState(null)
  // Achievements waiting to be shown by the pop-up: [{ key, slug, achievement }]
  const [unlocks, setUnlocks] = useState([])

  // Actions read the latest state through refs so they never change identity.
  const dataRef = useRef(data)
  const pathRef = useRef(pathname)
  const playingRef = useRef(null)
  // The friend whose conversation is open on the Messages page, if any
  const viewingRef = useRef(null)
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
  const theme = data.prefs.theme
  const sidebar = data.prefs.sidebar

  useEffect(() => {
    document.documentElement.dataset.accent = accent
  }, [accent])

  // The inline script in the layout applies these before the first paint; these effects keep them in sync.
  useEffect(() => {
    if (!hydrated) return
    if (sidebar === 'collapsed') document.documentElement.dataset.sidebar = 'collapsed'
    else delete document.documentElement.dataset.sidebar
  }, [hydrated, sidebar])

  useEffect(() => {
    if (!hydrated) return
    const root = document.documentElement
    const query = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      root.dataset.theme = theme === 'system' ? (query.matches ? 'light' : 'dark') : theme
    }
    apply()
    if (theme !== 'system') return
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [hydrated, theme])

  const actions = useMemo(() => {
    // passed to every module in ./actions
    const accountOf = (d) => (d.session ? d.accounts[d.session.username] : null)
    const owned = (slug) => Boolean(accountOf(dataRef.current)?.library.some((entry) => entry.slug === slug))
    const username = () => dataRef.current.session?.username

    const updateAccount = (update) =>
      setData((d) => (d.session ? { ...d, accounts: { ...d.accounts, [d.session.username]: update(d.accounts[d.session.username]) } } : d))
    const updateOther = (name, update) =>
      setData((d) => (d.accounts[name] ? { ...d, accounts: { ...d.accounts, [name]: update(d.accounts[name]) } } : d))
    const updateEntry = (slug, changes) =>
      updateAccount((acc) => ({ ...acc, library: acc.library.map((entry) => (entry.slug === slug ? { ...entry, ...changes } : entry)) }))
    const updateCommunity = (update) => setData((d) => ({ ...d, community: update(d.community) }))
    const promptSignIn = (message) =>
      toast({ message, href: `/login?next=${encodeURIComponent(pathRef.current)}`, actionLabel: 'Log in' })

    // A local account or demo player, for friend requests and gifts.
    const findUser = (name) => {
      const key = name?.trim().toLowerCase()
      if (!key) return null
      const local = dataRef.current.accounts[key]
      if (local) return { username: key, displayName: local.profile.displayName, local: true }
      const player = getPlayer(key)
      return player ? { username: key, displayName: player.displayName, demo: true } : null
    }

    const announceAchievements = (slug, achievements) => {
      setUnlocks((queue) => [...queue, ...achievements.map((achievement) => ({ key: `${slug}:${achievement.id}:${Date.now()}`, slug, achievement }))].slice(-12))
      updateAccount((acc) => completeStep(acc, 'achievement'))
    }

    const ctx = { dataRef, pathRef, playingRef, setData, setPlaying, toast, accountOf, owned, username, updateAccount, updateOther, updateEntry, updateCommunity, promptSignIn, findUser, announceAchievements, viewingRef }
    const playtime = createPlaytime(ctx)
    Object.assign(ctx, playtime)
    return {
      // Called every few seconds while a game is running
      commitPlaytime: playtime.commitPlaytime,
      ...accountActions(ctx),
      ...shopActions(ctx),
      ...libraryActions(ctx),
      ...socialActions(ctx),
      ...messageActions(ctx),
      dismissUnlock: (key) => setUnlocks((queue) => queue.filter((u) => u.key !== key)),
      // Hides (or brings back) the first-visit checklist on the Discover page
      setTourDismissed: (dismissed) => updateAccount((acc) => ({ ...acc, tour: { ...acc.tour, dismissed } })),
    }
  }, [toast])

  // While a game runs, credit its playtime every few seconds (and when the page is closed)
  const playingSlug = playing?.slug
  const { commitPlaytime } = actions
  useEffect(() => {
    if (!playingSlug) return
    const timer = setInterval(commitPlaytime, 5000)
    window.addEventListener('pagehide', commitPlaytime)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pagehide', commitPlaytime)
    }
  }, [playingSlug, commitPlaytime])

  // While a demo player has a request from you, check every couple of seconds whether they've accepted
  const awaitingDemo = Boolean(account?.requests.outgoing.some((r) => !data.accounts[r.username] && getPlayer(r.username)))
  const { resolveRequests } = actions
  useEffect(() => {
    if (!awaitingDemo) return
    resolveRequests()
    const timer = setInterval(resolveRequests, 2000)
    return () => clearInterval(timer)
  }, [awaitingDemo, resolveRequests])

  // While a demo player is about to reply, check every second
  const awaitingReply = Boolean(account?.pendingReplies.length)
  const { resolveReplies } = actions
  useEffect(() => {
    if (!awaitingReply) return
    resolveReplies()
    const timer = setInterval(resolveReplies, 1000)
    return () => clearInterval(timer)
  }, [awaitingReply, resolveReplies])

  const value = useMemo(() => {
    const { session, accounts, cart, community, prefs } = data
    const acc = session ? accounts[session.username] : null
    const library = acc?.library ?? EMPTY
    const wishlist = acc?.wishlist ?? EMPTY
    const notifications = acc?.notifications ?? EMPTY
    const ownedSlugs = new Set(library.map((entry) => entry.slug))
    const wished = new Set(wishlist.map((entry) => entry.slug))
    // Your conversations, latest first: [{ username, last, unread }]
    const myName = session?.username
    const conversations = myName
      ? Object.entries(data.messages)
          .filter(([id, thread]) => thread.length > 0 && id.split(':').includes(myName))
          .map(([id, thread]) => ({
            username: otherIn(id, myName),
            last: thread.at(-1),
            unread: thread.filter((m) => m.from !== myName && m.sentAt > (acc.lastRead[id] ?? 0)).length,
          }))
          .sort((a, b) => b.last.sentAt - a.last.sentAt)
      : EMPTY
    // Prices show in US dollars until the saved currency has loaded, so server and client HTML match
    const currency = hydrated ? prefs.currency : 'USD'

    // Public profile info for any local account or demo player (used for review/comment authors and friends)
    const profileOf = (name) => {
      const p = accounts[name]?.profile
      if (p) return { username: name, displayName: p.displayName, hue: p.avatarHue ?? authorHue(name), avatar: p.avatar ?? undefined, local: true }
      const player = getPlayer(name)
      return { username: name, displayName: player?.displayName ?? name, hue: authorHue(name), demo: Boolean(player) }
    }

    return {
      hydrated,
      session,
      user: session ? profileOf(session.username) : null,
      profile: acc?.profile ?? null,
      settings: acc?.settings ?? DEFAULT_SETTINGS,
      prefs,
      currency,
      formatPrice: (usd) => formatPrice(usd, currency),
      formatMoney: (usd) => formatMoney(usd, currency),
      library,
      wishlist,
      cart,
      community,
      collections: acc?.collections ?? EMPTY,
      friends: acc?.friends ?? EMPTY,
      incomingRequests: acc?.requests.incoming ?? EMPTY,
      outgoingRequests: acc?.requests.outgoing ?? EMPTY,
      blocked: acc?.blocked ?? EMPTY,
      // 'online', 'away' or 'invisible' (see STATUSES)
      status: acc?.profile.status ?? 'online',
      hasPassword: Boolean(acc?.credentials),
      tour: acc?.tour ?? null,
      conversations,
      unreadMessages: conversations.reduce((sum, c) => sum + c.unread, 0),
      messagesWith: (name) => (myName ? data.messages[threadId(myName, name)] ?? EMPTY : EMPTY),
      // Demo players about to answer (for the "typing..." indicator)
      pendingReplies: acc?.pendingReplies ?? EMPTY,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      transactions: acc?.transactions ?? EMPTY,
      wallet: acc?.wallet ?? { balance: 0 },
      redeemedCodes: acc?.redeemedCodes ?? EMPTY,
      playing,
      unlocks,
      accounts,
      profileOf,
      owns: (slug) => ownedSlugs.has(slug),
      isWishlisted: (slug) => wished.has(slug),
      isFriend: (name) => Boolean(acc?.friends.some((f) => f.username === name)),
      isBlocked: (name) => Boolean(acc?.blocked.some((b) => b.username === name)),
      // 'incoming', 'outgoing' or null: a friend request between you and `name`
      requestWith: (name) =>
        acc?.requests.incoming.some((r) => r.username === name) ? 'incoming' : acc?.requests.outgoing.some((r) => r.username === name) ? 'outgoing' : null,
      getEntry: (slug) => library.find((entry) => entry.slug === slug),
      refundInfo: (slug, dlcId = null) => refundCheck(acc, slug, dlcId),
      // { items, coupon, total, ... } for the current cart, as checkout would charge it
      cartPricing: priceCart(data),
      coupon: data.coupon,
      // { bought, included, all } DLC ids for a game
      dlcFor: (slug) => ownedDlc(acc, slug),
      // The cart item that will buy `slug` for you: the game itself or a bundle containing it (gifts don't count)
      cartItemFor: (slug) =>
        cart.find((item) => !item.gift && (item.type === 'game' ? item.slug === slug : item.type === 'bundle' && getBundle(item.slug).games.includes(slug))),
      ...actions,
    }
  }, [hydrated, data, playing, unlocks, actions])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}
