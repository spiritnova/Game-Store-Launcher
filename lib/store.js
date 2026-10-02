'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { newlyUnlocked } from '@/lib/achievements'
import { authorHue } from '@/lib/community'
import { CURRENCIES, formatMoney, formatPrice } from '@/lib/currency'
import { applyCoupon, COUPONS } from '@/lib/coupons'
import { bundlePrice, currentPrice, discountPercent, dlcPrice, editionDlc, editionPrice, getBundle, getDlc, getEdition, getGame, isOnSale, upgradePrice } from '@/lib/games'
import { getPlayer, playerOwns } from '@/lib/players'
import { hash, pick, random } from '@/lib/random'
// Also read by the inline script in app/layout.js, which applies the theme before the page paints.
import { STORAGE_KEY } from '@/lib/storage-key'
import { useToast } from '@/app/Components/UI/Toast'

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

export const THEMES = {
  dark: { label: 'Dark' },
  light: { label: 'Light' },
  system: { label: 'Match my system' },
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

// Simulated install drives. `usedGB` is space already taken by other files.
export const DRIVES = {
  c: { label: 'Local Disk (C:)', path: 'C:\\Program Files\\Ultimate\\Games', capacityGB: 1000, usedGB: 312 },
  d: { label: 'Games (D:)', path: 'D:\\UltimateLibrary', capacityGB: 2000, usedGB: 140 },
}

// Space used on each drive: other files plus the games installed there.
export function driveUsage(library) {
  return Object.entries(DRIVES).map(([id, drive]) => {
    const gamesGB = library.filter((e) => e.installed && (e.drive ?? 'c') === id).reduce((sum, e) => sum + (getGame(e.slug).sizeGB ?? 0), 0)
    const usedGB = drive.usedGB + gamesGB
    return { id, ...drive, gamesGB, freeGB: Math.max(0, drive.capacityGB - usedGB), percent: Math.min(100, (usedGB / drive.capacityGB) * 100) }
  })
}

// Which notification types each notification setting covers.
export const NOTIFICATION_SETTINGS = {
  sales: { label: 'Wishlist sales', description: 'When a game on your wishlist is discounted.', types: ['sale'] },
  downloads: { label: 'Downloads and updates', description: 'When a game finishes installing or updating.', types: ['download', 'update'] },
  social: { label: 'Friends and gifts', description: 'Friend requests and games gifted to you.', types: ['friend', 'gift'] },
  achievements: { label: 'Achievements', description: 'When you unlock an achievement.', types: ['achievement'] },
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
  installDrive: 'c',
  // Demo: every real second of play counts as a minute, so achievements unlock while you watch.
  fastPlaytime: true,
  notify: { sales: true, downloads: true, social: true, achievements: true },
}

// Per-device preferences that apply whether or not someone is signed in.
export const DEFAULT_PREFS = { theme: 'dark', currency: 'USD', birthDate: null }

export const REFUND_DAYS = 14
export const REFUND_MINUTES = 120
export const WALLET_AMOUNTS = [5, 10, 25, 50, 100]
// Demo gift card codes, each redeemable once per account.
export const GIFT_CODES = { 'ULTIMATE-DEMO-20': 20, 'WELCOME-5': 5 }

// ---------- Simulated game updates ----------
// Installed games get an update now and then, decided deterministically per game and week so the
// Library, game pages and Downloads page always agree. No server involved.
const WEEK = 7 * DAY
export const currentWeek = () => Math.floor(Date.now() / WEEK)

const PATCH_NOTES = [
  'Performance improvements on lower-end graphics cards',
  'Fixed a crash when switching windows during cutscenes',
  'Controller remapping fixes',
  'Shorter loading times when continuing a save',
  'New photo mode filters',
  'Improved ultrawide monitor support',
  'Updated translations',
  'Fixed rare save corruption after a power loss',
  'Audio mixing improvements',
  'Accessibility: larger subtitle options',
]
const ONLINE_NOTES = ['Balance changes for the current season', 'Anti-cheat and server stability updates', 'Matchmaking improvements']

// The version a game installs at, before any updates
function baseVersion(slug) {
  const h = hash(`version:${slug}`)
  return `${1 + (h % 3)}.${(h >> 3) % 10}.${(h >> 7) % 8}`
}

export function installedVersion(entry) {
  return entry.version ?? baseVersion(entry.slug)
}

// Size, version and patch notes for an update, the same wherever it's shown
function describeUpdate(entry, seed, sizeGB) {
  const game = getGame(entry.slug)
  const [major, minor, patch] = installedVersion(entry).split('.').map(Number)
  const rand = random(hash(`notes:${entry.slug}:${seed}`))
  const pool = game?.features.includes('Online multiplayer') ? [...ONLINE_NOTES, ...PATCH_NOTES] : PATCH_NOTES
  return { sizeGB, version: `${major}.${minor}.${patch + 1}`, notes: pick(rand, pool, 2 + Math.floor(rand() * 2)) }
}

// The update waiting for an installed game, or null. Some arrive weekly at random; demo games can
// also start with one pending (`pendingUpdate`).
export function getUpdate(entry, week = currentWeek()) {
  if (!entry.installed) return null
  if (entry.pendingUpdate) return describeUpdate(entry, 'pending', entry.pendingUpdate.sizeGB)
  if ((entry.updatedWeek ?? 0) >= week) return null
  const h = hash(`${entry.slug}:${week}`)
  if (h % 5 >= 2) return null
  const game = getGame(entry.slug)
  const size = Math.min(0.3 + (h % 90) / 10, (game?.sizeGB ?? 4) * 0.25)
  return describeUpdate(entry, week, Math.max(0.1, Math.round(size * 10) / 10))
}

// ---------- Records ----------
const uid = () => Math.random().toString(36).slice(2, 8)
const transactionId = () => `UL-${Date.now().toString(36).slice(-5)}${uid().slice(0, 3)}`.toUpperCase()
const toCents = (amount) => Math.round(amount * 100) / 100

function libraryEntry(slug, fields = {}) {
  return { slug, edition: 'standard', purchasedAt: Date.now(), installed: false, playtimeMinutes: 0, lastPlayed: null, ...fields }
}

function notification(type, fields) {
  return { id: `${type}-${Date.now()}-${uid()}`, type, createdAt: Date.now(), read: false, ...fields }
}

// Adds a notification to an account, unless the account turned that type off.
function pushNotification(account, item) {
  const setting = Object.entries(NOTIFICATION_SETTINGS).find(([, s]) => s.types.includes(item.type))?.[0]
  if (setting && account.settings.notify?.[setting] === false) return account
  return { ...account, notifications: [item, ...account.notifications].slice(0, 50) }
}

// "A game on your wishlist is on sale" for every discounted wishlist game the account hasn't heard about yet.
// Checked when someone signs in or opens the launcher, like a store's sale email.
function withSaleAlerts(account) {
  const fresh = account.wishlist.filter((entry) => isOnSale(getGame(entry.slug)) && !account.seenSales[entry.slug])
  if (fresh.length === 0) return account
  let next = { ...account, seenSales: { ...account.seenSales, ...Object.fromEntries(fresh.map((entry) => [entry.slug, true])) } }
  for (const entry of fresh) {
    const game = getGame(entry.slug)
    next = pushNotification(next, notification('sale', {
      slug: game.slug,
      title: `${game.title} is ${discountPercent(game)}% off`,
      body: 'A game on your wishlist is on sale.',
      href: `/games/${game.slug}`,
    }))
  }
  return next
}

function newAccount(displayName, overrides = {}) {
  return {
    profile: { displayName, bio: '', avatarHue: null, createdAt: Date.now(), lastSeen: null, ...overrides.profile },
    settings: { ...DEFAULT_SETTINGS },
    library: overrides.library ?? [],
    wishlist: overrides.wishlist ?? [],
    collections: overrides.collections ?? [],
    friends: overrides.friends ?? [],
    notifications: overrides.notifications ?? [],
    transactions: overrides.transactions ?? [],
    wallet: overrides.wallet ?? { balance: 0 },
    redeemedCodes: [],
    seenSales: {},
    // { [gameSlug]: { [dlcId]: { purchasedAt, playtimeAtPurchase } } }
    dlc: overrides.dlc ?? {},
    usedCoupons: [],
  }
}

function purchaseRecord(createdAt, method, slug, editionId, price) {
  const game = getGame(slug)
  const edition = getEdition(game, editionId)
  return {
    id: transactionId(),
    type: 'purchase',
    createdAt,
    method,
    items: [{ slug, edition: edition.id, title: game.title, editionName: edition.name, original: edition.price, price }],
    total: price,
  }
}

function dlcRecord(createdAt, method, slug, dlc) {
  const game = getGame(slug)
  return {
    id: transactionId(),
    type: 'purchase',
    createdAt,
    method,
    items: [{ slug, dlc: dlc.id, title: dlc.title, gameTitle: game.title, original: dlc.price, price: dlcPrice(dlc) }],
    total: dlcPrice(dlc),
  }
}

// The demo account comes with a few games, friends and a purchase history so the showcase isn't empty.
// Two of its installed games have updates waiting, and it updates manually so they stay visible.
function demoAccount() {
  const now = Date.now()
  const friendsSince = now - 90 * DAY
  const account = newAccount(DEMO_USER.displayName, {
    profile: { bio: 'Here for the open worlds and the occasional boss fight.', createdAt: now - 400 * DAY },
    library: [
      libraryEntry('the-witcher-3', { edition: 'complete', purchasedAt: now - 120 * DAY, installed: true, playtimeMinutes: 2235, lastPlayed: now - 2 * DAY, favorite: true, pendingUpdate: { sizeGB: 2.4 } }),
      libraryEntry('devil-may-cry-5', { purchasedAt: now - 60 * DAY, installed: true, playtimeMinutes: 640, lastPlayed: now - 9 * DAY, pendingUpdate: { sizeGB: 0.8 } }),
      libraryEntry('hades', { purchasedAt: now - 200 * DAY, installed: true, playtimeMinutes: 1860, lastPlayed: now - 20 * DAY, updatedWeek: currentWeek() }),
      libraryEntry('red-dead-redemption-2', { purchasedAt: now - 3 * DAY }),
    ],
    wishlist: [{ slug: 'god-of-war', addedAt: now - 5 * DAY }],
    collections: [{ id: 'open-worlds', name: 'Open worlds', slugs: ['the-witcher-3', 'red-dead-redemption-2'] }],
    friends: ['pixelnomad', 'lunabyte', 'kaiplays', 'frostleaf'].map((username) => ({ username, since: friendsSince })),
    // $20 added to the wallet, then Red Dead Redemption 2 bought with it on sale
    wallet: { balance: 5.01 },
    transactions: [
      purchaseRecord(now - 3 * DAY, 'wallet', 'red-dead-redemption-2', 'standard', 14.99),
      {
        id: transactionId(),
        type: 'funds',
        createdAt: now - 4 * DAY,
        method: 'card',
        items: [{ title: 'Wallet funds', original: 20, price: 20 }],
        total: 20,
      },
      purchaseRecord(now - 60 * DAY, 'card', 'devil-may-cry-5', 'standard', 29.99),
      purchaseRecord(now - 120 * DAY, 'card', 'the-witcher-3', 'complete', 49.99),
      purchaseRecord(now - 200 * DAY, 'card', 'hades', 'standard', 24.99),
    ],
  })
  // A DLC bought for Devil May Cry 5 a while back, if the catalog has one
  const dmcDlc = getGame('devil-may-cry-5')?.dlc?.at(-1)
  if (dmcDlc) {
    account.dlc = { 'devil-may-cry-5': { [dmcDlc.id]: { purchasedAt: now - 40 * DAY, playtimeAtPurchase: 300 } } }
    account.transactions = [...account.transactions, dlcRecord(now - 40 * DAY, 'card', 'devil-may-cry-5', dmcDlc)].sort((x, y) => y.createdAt - x.createdAt)
  }
  return { ...account, settings: { ...account.settings, autoUpdate: 'manual' } }
}

const emptyCommunity = () => ({ reviews: {}, comments: {}, helpful: {} })

function initialState(prefs = DEFAULT_PREFS) {
  return { session: null, accounts: { [DEMO_USER.username]: demoAccount() }, cart: [], coupon: null, community: emptyCommunity(), prefs }
}

const knownGame = (entry) => entry && getGame(entry.slug)
const list = (value) => (Array.isArray(value) ? value : [])

function sanitizeAccount(account, username) {
  const fresh = newAccount(username)
  const library = list(account?.library)
    .filter(knownGame)
    .map((entry) => ({ edition: 'standard', favorite: false, hidden: false, achievements: {}, launchOptions: '', drive: 'c', ...entry }))
  return {
    profile: { ...fresh.profile, ...account?.profile },
    settings: { ...DEFAULT_SETTINGS, ...account?.settings, notify: { ...DEFAULT_SETTINGS.notify, ...account?.settings?.notify } },
    library,
    wishlist: list(account?.wishlist).filter(knownGame),
    collections: list(account?.collections).map((c) => ({ ...c, slugs: list(c.slugs).filter((slug) => getGame(slug)) })),
    friends: list(account?.friends).filter((f) => f?.username),
    notifications: list(account?.notifications),
    transactions: list(account?.transactions),
    wallet: { balance: Number(account?.wallet?.balance) || 0 },
    redeemedCodes: list(account?.redeemedCodes),
    seenSales: account?.seenSales ?? {},
    dlc: account?.dlc && typeof account.dlc === 'object' ? account.dlc : {},
    usedCoupons: list(account?.usedCoupons),
  }
}

function sanitizeCart(cart) {
  return list(cart).filter((item) => {
    if (item.type === 'bundle') return getBundle(item.slug)
    if (item.type === 'dlc') return getGame(item.slug) && getDlc(getGame(item.slug), item.dlc)
    if (item.type === 'upgrade') return getGame(item.slug)?.editions.some((e) => e.id === item.edition)
    return getGame(item.slug)
  })
}

// DLC an account owns for a game: bought separately, or included with its edition
export function ownedDlc(account, slug) {
  const entry = account?.library.find((e) => e.slug === slug)
  const bought = Object.keys(account?.dlc?.[slug] ?? {})
  const included = entry ? editionDlc(getGame(slug), entry.edition) : []
  return { bought, included, all: [...new Set([...included, ...bought])] }
}

function sanitizePrefs(prefs) {
  const merged = { ...DEFAULT_PREFS, ...prefs }
  return {
    theme: THEMES[merged.theme] ? merged.theme : DEFAULT_PREFS.theme,
    currency: CURRENCIES[merged.currency] ? merged.currency : DEFAULT_PREFS.currency,
    birthDate: typeof merged.birthDate === 'string' ? merged.birthDate : null,
  }
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
    prefs: { ...DEFAULT_PREFS },
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
    const session = parsed.session && accounts[parsed.session.username] ? { username: parsed.session.username } : null
    if (session) accounts[session.username] = withSaleAlerts(accounts[session.username])
    return {
      session,
      accounts,
      cart: sanitizeCart(parsed.cart),
      coupon: COUPONS[parsed.coupon] ? parsed.coupon : null,
      community: { ...emptyCommunity(), ...parsed.community },
      prefs: sanitizePrefs(parsed.prefs),
    }
  } catch {
    return initialState()
  }
}

// Age in whole years for a "YYYY-MM-DD" birth date.
export function ageFrom(birthDate, now = new Date()) {
  const [y, m, d] = birthDate.split('-').map(Number)
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
  return age
}

// Whether a purchase of a game (or one of its DLC, with `dlcId`) can still be refunded: bought in the
// last 14 days and played less than 2 hours (for DLC, since it was bought).
function refundCheck(account, slug, dlcId = null, now = Date.now()) {
  const entry = account?.library.find((e) => e.slug === slug)
  const thing = dlcId ? 'DLC' : 'game'
  if (dlcId) {
    const owned = account?.dlc?.[slug]?.[dlcId]
    if (!owned) return editionDlc(getGame(slug), entry?.edition).includes(dlcId) ? { eligible: false, reason: 'It came with your edition of the game.' } : null
  } else {
    if (!entry) return null
    if (entry.giftFrom) return { eligible: false, reason: 'Games you received as a gift can’t be refunded.' }
  }
  const matches = (i) => i.slug === slug && (dlcId ? i.dlc === dlcId : !i.dlc && !i.upgrade) && !i.giftTo && !i.refunded
  const transaction = account.transactions.find((t) => t.type === 'purchase' && t.items.some(matches))
  if (!transaction) return { eligible: false, reason: `There is no purchase record for this ${thing}.` }
  const item = transaction.items.find(matches)
  const deadline = transaction.createdAt + REFUND_DAYS * DAY
  const played = (entry?.playtimeMinutes ?? 0) - (dlcId ? account.dlc[slug][dlcId].playtimeAtPurchase ?? 0 : 0)
  // Refunding a game also refunds edition upgrades bought for it
  const upgrades = dlcId
    ? []
    : account.transactions.flatMap((t) => (t.type === 'purchase' ? t.items.filter((i) => i.slug === slug && i.upgrade && !i.refunded).map((i) => ({ transaction: t, item: i })) : []))
  const total = toCents(item.price + upgrades.reduce((sum, u) => sum + u.item.price, 0))
  const info = { transaction, item, amount: item.price, upgrades, total, method: transaction.method, deadline }
  if (item.price === 0) return { ...info, eligible: false, reason: `Free ${thing === 'game' ? 'games' : 'DLC'} can’t be refunded.` }
  if (now > deadline) return { ...info, eligible: false, reason: `It was bought more than ${REFUND_DAYS} days ago.` }
  if (played >= REFUND_MINUTES) return { ...info, eligible: false, reason: `It has been played for ${REFUND_MINUTES / 60} hours or more${dlcId ? ' since it was bought' : ''}.` }
  return { ...info, eligible: true }
}

// What the cart costs for the signed-in account (or a visitor): one line per game, DLC or upgrade
// actually being bought (bundles are split per game), with the coupon split across the lines.
// Shared by the cart, which previews it, and checkout, which charges it.
function priceCart(d) {
  const me = d.session ? d.accounts[d.session.username] : null
  const ownedSlugs = new Set((me?.library ?? []).map((entry) => entry.slug))
  const items = []
  const purchases = []
  const gifts = []
  const dlcBought = []
  const upgrades = []
  // Games first, then add-ons (DLC and upgrades need the game: owned, or bought in this order)
  const addOn = (item) => item.type === 'dlc' || item.type === 'upgrade'
  const ordered = [...d.cart.filter((item) => !addOn(item)), ...d.cart.filter(addOn)]
  for (const item of ordered) {
    if (item.type === 'upgrade') {
      const game = getGame(item.slug)
      const entry = me?.library.find((e) => e.slug === item.slug)
      if (!entry || getEdition(game, entry.edition).price >= getEdition(game, item.edition).price) continue
      const from = getEdition(game, entry.edition)
      const to = getEdition(game, item.edition)
      const cost = upgradePrice(game, from.id, to.id, Object.keys(me.dlc?.[item.slug] ?? {}))
      items.push({ slug: game.slug, upgrade: to.id, from: from.id, title: `${to.name} upgrade`, gameTitle: game.title, original: cost.original, price: cost.price })
      upgrades.push({ game, from, to })
    } else if (item.type === 'dlc') {
      const game = getGame(item.slug)
      const dlc = getDlc(game, item.dlc)
      if (!ownedSlugs.has(item.slug) || (me && ownedDlc(me, item.slug).all.includes(dlc.id))) continue
      items.push({ slug: game.slug, dlc: dlc.id, title: dlc.title, gameTitle: game.title, original: dlc.price, price: dlcPrice(dlc) })
      dlcBought.push({ game, dlc })
    } else if (item.type === 'game') {
      const game = getGame(item.slug)
      const edition = getEdition(game, item.edition)
      const price = editionPrice(game, edition)
      const line = { slug: game.slug, edition: edition.id, title: game.title, editionName: edition.name, original: edition.price, price }
      if (item.gift) {
        const to = item.gift.to
        const theyOwn = d.accounts[to] ? d.accounts[to].library.some((e) => e.slug === game.slug) : playerOwns(to, game.slug)
        if (theyOwn) continue
        items.push({ ...line, giftTo: to })
        gifts.push({ game, edition, to, message: item.gift.message })
        continue
      }
      if (ownedSlugs.has(item.slug)) continue
      items.push(line)
      purchases.push({ game, edition })
      ownedSlugs.add(item.slug)
    } else {
      const bundle = getBundle(item.slug)
      const price = bundlePrice(bundle, (slug) => ownedSlugs.has(slug))
      // Split the bundle price across its games (in proportion to their prices) so each one can be refunded on its own
      let allocated = 0
      price.games.forEach((game, i) => {
        const last = i === price.games.length - 1
        const share = last ? toCents(price.price - allocated) : price.separate ? toCents((price.price * currentPrice(game)) / price.separate) : 0
        allocated += share
        const edition = getEdition(game)
        items.push({ slug: game.slug, edition: edition.id, title: game.title, editionName: edition.name, original: game.price, price: share, bundle: bundle.title })
        purchases.push({ game, edition, bundle: bundle.title })
        ownedSlugs.add(game.slug)
      })
    }
  }

  let coupon = null
  if (d.coupon) {
    const lines = items.map((item) => ({ slug: item.slug, price: item.price, type: item.dlc ? 'dlc' : item.upgrade ? 'upgrade' : 'game' }))
    coupon = applyCoupon(d.coupon, lines, { usedCoupons: me?.usedCoupons ?? [], giftCodes: GIFT_CODES, formatMoney: (n) => formatMoney(n, d.prefs.currency) })
    if (coupon.ok) coupon.shares.forEach((share, i) => {
      if (share > 0) items[i] = { ...items[i], price: toCents(items[i].price - share), couponDiscount: share }
    })
  }
  const total = toCents(items.reduce((sum, item) => sum + item.price, 0))
  return { items, purchases, gifts, dlcBought, upgrades, coupon, total }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const toast = useToast()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const [data, setData] = useState(initialState)
  // The game being played right now: { slug, startedAt, scale } (minutes of playtime per real second)
  const [playing, setPlaying] = useState(null)

  // Actions read the latest state through refs so they never change identity.
  const dataRef = useRef(data)
  const pathRef = useRef(pathname)
  const playingRef = useRef(null)
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

  useEffect(() => {
    document.documentElement.dataset.accent = accent
  }, [accent])

  // The inline script in the layout applies the saved theme before the first paint; this keeps it in sync.
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
      toast({ message, href: `/signin?next=${encodeURIComponent(pathRef.current)}`, actionLabel: 'Sign in' })

    // A local account or demo player, for friend requests and gifts.
    const findUser = (name) => {
      const key = name?.trim().toLowerCase()
      if (!key) return null
      const local = dataRef.current.accounts[key]
      if (local) return { username: key, displayName: local.profile.displayName, local: true }
      const player = getPlayer(key)
      return player ? { username: key, displayName: player.displayName, demo: true } : null
    }

    // ---------- Playtime ----------
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
      if (unlocked.length === 1) toast({ message: `Achievement unlocked: ${unlocked[0].name} (${game.title})`, href: `/games/${slug}#achievements`, actionLabel: 'View' })
      else if (unlocked.length > 1) toast({ message: `${unlocked.length} achievements unlocked in ${game.title}`, href: `/games/${slug}#achievements`, actionLabel: 'View' })
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

    function refundDlc(slug, dlcId, check) {
      const dlc = getDlc(getGame(slug), dlcId)
      const now = Date.now()
      const record = { id: transactionId(), type: 'refund', createdAt: now, method: check.method, refundOf: check.transaction.id, items: [{ ...check.item }], total: check.amount }
      updateAccount((acc) => {
        const { [dlcId]: _removed, ...rest } = acc.dlc[slug] ?? {}
        return pushNotification(
          {
            ...acc,
            dlc: { ...acc.dlc, [slug]: rest },
            transactions: [
              record,
              ...acc.transactions.map((t) =>
                t.id === check.transaction.id ? { ...t, items: t.items.map((i) => (i.slug === slug && i.dlc === dlcId && !i.refunded ? { ...i, refunded: now } : i)) } : t
              ),
            ],
            wallet: check.method === 'wallet' ? { balance: toCents(acc.wallet.balance + check.amount) } : acc.wallet,
          },
          notification('refund', {
            slug,
            title: `Refund issued for ${dlc.title}`,
            body: `${formatMoney(check.amount, dataRef.current.prefs.currency)} was returned to your ${check.method === 'wallet' ? 'wallet' : 'card'}.`,
            href: '/settings#purchases',
          })
        )
      })
      toast({ message: `${dlc.title} was refunded.`, href: '/settings#purchases', actionLabel: 'View purchases' })
    }

    function signOutCurrent() {
      stopPlaying({ quiet: true })
      const name = username()
      if (name) updateAccount((acc) => ({ ...acc, profile: { ...acc.profile, lastSeen: Date.now() } }))
      return name
    }

    return {
      // Called every few seconds while a game is running
      commitPlaytime,

      signIn({ username: name, displayName }) {
        const key = name.trim().toLowerCase()
        if (dataRef.current.session?.username !== key) signOutCurrent()
        const existing = dataRef.current.accounts[key]
        const acc = withSaleAlerts(existing ?? (key === DEMO_USER.username ? demoAccount() : newAccount(displayName?.trim() || name.trim())))
        const ownedSlugs = new Set(acc.library.map((entry) => entry.slug))
        setData((d) => ({
          ...d,
          session: { username: key },
          accounts: { ...d.accounts, [key]: acc },
          // Drop cart items the user already owns, and gifts addressed to themselves
          cart: d.cart.filter((item) => {
            if (item.gift) return item.gift.to !== key
            if (item.type === 'dlc') return !ownedDlc(acc, item.slug).all.includes(item.dlc)
            if (item.type === 'upgrade') {
              const entry = acc.library.find((e) => e.slug === item.slug)
              return Boolean(entry) && getEdition(getGame(item.slug), entry.edition).price < getEdition(getGame(item.slug), item.edition).price
            }
            return item.type === 'game' ? !ownedSlugs.has(item.slug) : getBundle(item.slug).games.some((slug) => !ownedSlugs.has(slug))
          }),
        }))
        toast({ message: `Signed in as ${acc.profile.displayName}.` })
      },
      signOut({ quiet = false } = {}) {
        signOutCurrent()
        setData((d) => ({ ...d, session: null }))
        if (!quiet) toast({ message: 'You have been signed out.' })
      },
      deleteAccount() {
        const name = signOutCurrent()
        if (!name) return
        setData((d) => {
          const accounts = {}
          for (const [other, acc] of Object.entries(d.accounts)) {
            if (other !== name) accounts[other] = { ...acc, friends: acc.friends.filter((f) => f.username !== name) }
          }
          const byOthers = (items) => items.filter((item) => item.author.username !== name)
          const reviews = Object.fromEntries(Object.entries(d.community.reviews).map(([slug, items]) => [slug, byOthers(items)]))
          const comments = Object.fromEntries(Object.entries(d.community.comments).map(([slug, items]) => [slug, byOthers(items)]))
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
      updatePrefs(changes) {
        setData((d) => ({ ...d, prefs: { ...d.prefs, ...changes } }))
      },

      // ---------- Cart & checkout ----------
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
      // Returns { ok, message } so the gift form can show what went wrong.
      addGiftToCart(game, editionId, to, message = '') {
        if (!username()) return { ok: false, message: 'Sign in to send gifts.' }
        const recipient = findUser(to)
        if (!recipient) return { ok: false, message: `No player called “${to.trim()}” was found.` }
        if (recipient.username === username()) return { ok: false, message: 'Gifts are for other players. Add the game to your cart instead.' }
        const theyOwn = recipient.local
          ? dataRef.current.accounts[recipient.username].library.some((e) => e.slug === game.slug)
          : playerOwns(recipient.username, game.slug)
        if (theyOwn) return { ok: false, message: `${recipient.displayName} already owns ${game.title}.` }
        const edition = getEdition(game, editionId)
        const id = `gift:${game.slug}:${recipient.username}`
        setData((d) => ({
          ...d,
          cart: [
            ...d.cart.filter((item) => item.id !== id),
            { id, type: 'game', slug: game.slug, edition: edition.id, gift: { to: recipient.username, message: message.trim() }, addedAt: Date.now() },
          ],
        }))
        toast({ message: `${game.title} was added to your cart as a gift for ${recipient.displayName}.`, href: '/cart', actionLabel: 'View cart' })
        return { ok: true }
      },
      addBundleToCart(bundle) {
        if (bundlePrice(bundle, owned).games.length === 0) return
        setData((d) => ({
          ...d,
          cart: [
            // The bundle replaces any of its games already in the cart
            ...d.cart.filter((item) => !(item.type === 'game' && !item.gift && bundle.games.includes(item.slug)) && item.id !== `bundle:${bundle.slug}`),
            { id: `bundle:${bundle.slug}`, type: 'bundle', slug: bundle.slug, addedAt: Date.now() },
          ],
        }))
        toast({ message: `${bundle.title} was added to your cart.`, href: '/cart', actionLabel: 'View cart' })
      },
      addDlcToCart(game, dlcId) {
        const dlc = getDlc(game, dlcId)
        if (!dlc || ownedDlc(accountOf(dataRef.current), game.slug).all.includes(dlcId)) return
        const id = `dlc:${game.slug}:${dlcId}`
        setData((d) => ({ ...d, cart: [...d.cart.filter((item) => item.id !== id), { id, type: 'dlc', slug: game.slug, dlc: dlcId, addedAt: Date.now() }] }))
        toast({ message: `${dlc.title} was added to your cart.`, href: '/cart', actionLabel: 'View cart' })
      },
      addUpgradeToCart(game, editionId) {
        const entry = accountOf(dataRef.current)?.library.find((e) => e.slug === game.slug)
        const edition = getEdition(game, editionId)
        if (!entry || getEdition(game, entry.edition).price >= edition.price) return
        const id = `upgrade:${game.slug}`
        setData((d) => ({ ...d, cart: [...d.cart.filter((item) => item.id !== id), { id, type: 'upgrade', slug: game.slug, edition: edition.id, addedAt: Date.now() }] }))
        toast({ message: `The ${edition.name} upgrade for ${game.title} was added to your cart.`, href: '/cart', actionLabel: 'View cart' })
      },
      // Returns { ok, message }
      applyCouponCode(input) {
        const result = priceCart({ ...dataRef.current, coupon: input.trim().toUpperCase() }).coupon
        if (!result?.ok) return { ok: false, message: result?.message ?? 'That coupon code isn’t valid.' }
        setData((d) => ({ ...d, coupon: result.code }))
        return { ok: true, message: `${result.code} applied: ${result.coupon.description}.` }
      },
      removeCoupon() {
        setData((d) => ({ ...d, coupon: null }))
      },
      removeFromCart(itemId) {
        setData((d) => ({ ...d, cart: d.cart.filter((item) => item.id !== itemId) }))
      },
      // Buys everything in the cart with `method` ('card' or 'wallet').
      // Returns { purchases, gifts, total, transactionId }, { error } when the wallet is short, or null when signed out.
      checkout(method = 'card') {
        const d = dataRef.current
        const me = accountOf(d)
        if (!me) return null
        const { items, purchases, gifts, dlcBought, upgrades, coupon, total } = priceCart(d)
        if (method === 'wallet' && me.wallet.balance + 0.001 < total) return { error: 'Your wallet balance is too low for this order.' }
        const now = Date.now()
        const record = { id: transactionId(), type: 'purchase', createdAt: now, method: total === 0 ? 'free' : method, items, total, ...(coupon?.ok ? { coupon: coupon.code } : {}) }
        const bought = new Set(purchases.map((p) => p.game.slug))
        const sender = d.session.username

        setData((current) => {
          const accounts = { ...current.accounts }
          const mine = accounts[sender]
          const dlc = { ...mine.dlc }
          for (const { game, dlc: item } of dlcBought) {
            const playtime = mine.library.find((e) => e.slug === game.slug)?.playtimeMinutes ?? 0
            dlc[game.slug] = { ...dlc[game.slug], [item.id]: { purchasedAt: now, playtimeAtPurchase: playtime } }
          }
          const upgraded = new Map(upgrades.map((u) => [u.game.slug, u.to.id]))
          accounts[sender] = {
            ...mine,
            dlc,
            usedCoupons: coupon?.ok ? [...new Set([...mine.usedCoupons, coupon.code])] : mine.usedCoupons,
            library: [
              ...mine.library.map((e) => (upgraded.has(e.slug) ? { ...e, edition: upgraded.get(e.slug) } : e)),
              ...purchases.map((p) => libraryEntry(p.game.slug, { edition: p.edition.id, purchasedAt: now })),
            ],
            wishlist: mine.wishlist.filter((entry) => !bought.has(entry.slug)),
            transactions: [record, ...mine.transactions],
            wallet: method === 'wallet' ? { balance: toCents(mine.wallet.balance - total) } : mine.wallet,
          }
          // Gifts to local accounts land in their library straight away
          for (const gift of gifts) {
            const them = accounts[gift.to]
            if (!them) continue
            accounts[gift.to] = pushNotification(
              { ...them, library: [...them.library, libraryEntry(gift.game.slug, { edition: gift.edition.id, purchasedAt: now, giftFrom: sender })], wishlist: them.wishlist.filter((w) => w.slug !== gift.game.slug) },
              notification('gift', {
                slug: gift.game.slug,
                title: `${mine.profile.displayName} sent you ${gift.game.title}`,
                body: gift.message || 'It’s in your library, ready to install.',
                href: `/games/${gift.game.slug}`,
              })
            )
          }
          return { ...current, accounts, cart: [], coupon: null }
        })
        return { purchases, gifts, dlc: dlcBought, upgrades, total, transactionId: record.id }
      },

      refund(slug, dlcId = null) {
        const me = accountOf(dataRef.current)
        const check = refundCheck(me, slug, dlcId)
        if (!check?.eligible) return
        if (dlcId) return refundDlc(slug, dlcId, check)
        if (playingRef.current?.slug === slug) stopPlaying({ quiet: true })
        const game = getGame(slug)
        const now = Date.now()
        const record = { id: transactionId(), type: 'refund', createdAt: now, method: check.method, refundOf: check.transaction.id, items: [{ ...check.item }], total: check.amount }
        // Each upgrade is refunded to whatever paid for it
        const upgradeRecords = check.upgrades.map((u) => ({ id: transactionId(), type: 'refund', createdAt: now, method: u.transaction.method, refundOf: u.transaction.id, items: [{ ...u.item }], total: u.item.price }))
        const toWallet = [record, ...upgradeRecords].filter((r) => r.method === 'wallet').reduce((sum, r) => sum + r.total, 0)
        const upgradeTx = new Set(check.upgrades.map((u) => u.transaction.id))
        updateAccount((acc) =>
          pushNotification(
            {
              ...acc,
              library: acc.library.filter((e) => e.slug !== slug),
              collections: acc.collections.map((c) => ({ ...c, slugs: c.slugs.filter((s) => s !== slug) })),
              transactions: [
                ...upgradeRecords,
                record,
                ...acc.transactions.map((t) => {
                  if (t.id !== check.transaction.id && !upgradeTx.has(t.id)) return t
                  return { ...t, items: t.items.map((i) => (i.slug === slug && !i.dlc && !i.giftTo && !i.refunded ? { ...i, refunded: now } : i)) }
                }),
              ],
              wallet: toWallet > 0 ? { balance: toCents(acc.wallet.balance + toWallet) } : acc.wallet,
            },
            notification('refund', {
              slug,
              title: `Refund issued for ${game.title}`,
              body: `${formatMoney(check.total, dataRef.current.prefs.currency)} was returned to your ${check.method === 'wallet' ? 'wallet' : 'card'}.`,
              href: '/settings#purchases',
            })
          )
        )
        toast({ message: `${game.title} was refunded and removed from your library.`, href: '/settings#purchases', actionLabel: 'View purchases' })
      },

      // ---------- Wallet ----------
      addFunds(amount) {
        if (!username()) return
        const record = { id: transactionId(), type: 'funds', createdAt: Date.now(), method: 'card', items: [{ title: 'Wallet funds', original: amount, price: amount }], total: amount }
        updateAccount((acc) => ({ ...acc, wallet: { balance: toCents(acc.wallet.balance + amount) }, transactions: [record, ...acc.transactions] }))
        toast({ message: `${formatMoney(amount, dataRef.current.prefs.currency)} was added to your wallet.` })
      },
      // Returns { ok, message }
      redeemCode(input) {
        const me = accountOf(dataRef.current)
        if (!me) return { ok: false, message: 'Sign in to redeem a code.' }
        const code = input.trim().toUpperCase()
        const value = GIFT_CODES[code]
        if (!value) return { ok: false, message: 'That code isn’t valid. Check it and try again.' }
        if (me.redeemedCodes.includes(code)) return { ok: false, message: 'You have already redeemed this code.' }
        const record = { id: transactionId(), type: 'funds', createdAt: Date.now(), method: 'code', items: [{ title: `Gift card ${code}`, original: value, price: value }], total: value }
        updateAccount((acc) => ({
          ...acc,
          wallet: { balance: toCents(acc.wallet.balance + value) },
          redeemedCodes: [...acc.redeemedCodes, code],
          transactions: [record, ...acc.transactions],
        }))
        const message = `${formatMoney(value, dataRef.current.prefs.currency)} was added to your wallet.`
        toast({ message })
        return { ok: true, message }
      },

      // ---------- Wishlist ----------
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

      // ---------- Library ----------
      markInstalled(slug) {
        const drive = accountOf(dataRef.current)?.settings.installDrive ?? 'c'
        // A fresh install is already up to date
        updateEntry(slug, { installed: true, updatedWeek: currentWeek(), pendingUpdate: null, drive })
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

      // ---------- Notifications ----------
      notify(type, fields) {
        if (!username()) return
        updateAccount((acc) => pushNotification(acc, notification(type, fields)))
      },
      markNotificationsRead(ids) {
        updateAccount((acc) => ({ ...acc, notifications: acc.notifications.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)) }))
      },
      removeNotification(id) {
        updateAccount((acc) => ({ ...acc, notifications: acc.notifications.filter((n) => n.id !== id) }))
      },
      clearNotifications() {
        updateAccount((acc) => ({ ...acc, notifications: [] }))
      },

      // ---------- Friends ----------
      // Friend requests are accepted straight away in this demo. Returns { ok, message }.
      addFriend(name) {
        const me = accountOf(dataRef.current)
        if (!me) return { ok: false, message: 'Sign in to add friends.' }
        const user = findUser(name)
        if (!user) return { ok: false, message: `No player called “${name.trim()}” was found.` }
        if (user.username === username()) return { ok: false, message: 'That’s you!' }
        if (me.friends.some((f) => f.username === user.username)) return { ok: false, message: `You and ${user.displayName} are already friends.` }
        const since = Date.now()
        const myName = username()
        updateAccount((acc) => ({ ...acc, friends: [...acc.friends, { username: user.username, since }] }))
        if (user.local) {
          updateOther(user.username, (acc) =>
            pushNotification(
              { ...acc, friends: [...acc.friends.filter((f) => f.username !== myName), { username: myName, since }] },
              notification('friend', { title: `${me.profile.displayName} added you as a friend`, href: `/u/${myName}` })
            )
          )
        }
        const message = `You and ${user.displayName} are now friends.`
        toast({ message, href: `/u/${user.username}`, actionLabel: 'View profile' })
        return { ok: true, message }
      },
      removeFriend(name) {
        const myName = username()
        const user = findUser(name)
        updateAccount((acc) => ({ ...acc, friends: acc.friends.filter((f) => f.username !== name) }))
        if (user?.local) updateOther(name, (acc) => ({ ...acc, friends: acc.friends.filter((f) => f.username !== myName) }))
        if (user) toast({ message: `Removed ${user.displayName} from your friends.` })
      },

      // ---------- Community ----------
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
        stopPlaying({ quiet: true })
        setData((d) => initialState(d.prefs))
        toast({ message: 'Demo data was reset and you were signed out.' })
      },
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

  const value = useMemo(() => {
    const { session, accounts, cart, community, prefs } = data
    const acc = session ? accounts[session.username] : null
    const library = acc?.library ?? EMPTY
    const wishlist = acc?.wishlist ?? EMPTY
    const notifications = acc?.notifications ?? EMPTY
    const ownedSlugs = new Set(library.map((entry) => entry.slug))
    const wished = new Set(wishlist.map((entry) => entry.slug))
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
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      transactions: acc?.transactions ?? EMPTY,
      wallet: acc?.wallet ?? { balance: 0 },
      redeemedCodes: acc?.redeemedCodes ?? EMPTY,
      playing,
      accounts,
      profileOf,
      owns: (slug) => ownedSlugs.has(slug),
      isWishlisted: (slug) => wished.has(slug),
      isFriend: (name) => Boolean(acc?.friends.some((f) => f.username === name)),
      getEntry: (slug) => library.find((entry) => entry.slug === slug),
      refundInfo: (slug, dlcId = null) => refundCheck(acc, slug, dlcId),
      // { items, coupon, total, … } for the current cart, as checkout would charge it
      cartPricing: priceCart(data),
      coupon: data.coupon,
      // { bought, included, all } DLC ids for a game
      dlcFor: (slug) => ownedDlc(acc, slug),
      // The cart item that will buy `slug` for you: the game itself or a bundle containing it (gifts don't count)
      cartItemFor: (slug) =>
        cart.find((item) => !item.gift && (item.type === 'game' ? item.slug === slug : item.type === 'bundle' && getBundle(item.slug).games.includes(slug))),
      ...actions,
    }
  }, [hydrated, data, playing, actions])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}

// Shared helpers for library views.
export function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return `${hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours)} h`
}

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

export function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
