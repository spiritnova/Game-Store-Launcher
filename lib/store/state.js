// The saved state: new and demo accounts, and loading (with migration and clean-up) from localStorage.
import { CURRENCIES } from '@/lib/currency'
import { COUPONS } from '@/lib/coupons'
import { getBundle, getDlc, getGame } from '@/lib/games'
// Also read by the inline script in app/layout.js, which applies the theme before the page paints.
import { STORAGE_KEY } from '@/lib/storage-key'
import { dlcRecord, libraryEntry, notification, purchaseRecord, transactionId, withStoreAlerts } from './records'
import { DEFAULT_PREFS, DEFAULT_SETTINGS, DEMO_USER, STATUSES, THEMES } from './settings'
import { currentWeek } from './updates'

const V2_KEY = 'ultimate-launcher:v2'
const LEGACY_KEYS = ['ultimate-launcher:v1', V2_KEY]
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export function newAccount(displayName, overrides = {}) {
  return {
    profile: { displayName, bio: '', avatarHue: null, createdAt: Date.now(), lastSeen: null, status: 'online', ...overrides.profile },
    settings: { ...DEFAULT_SETTINGS },
    library: overrides.library ?? [],
    wishlist: overrides.wishlist ?? [],
    collections: overrides.collections ?? [],
    friends: overrides.friends ?? [],
    // Friend requests waiting for an answer: [{ username, sentAt }]
    requests: overrides.requests ?? { incoming: [], outgoing: [] },
    // Players who can't send you friend requests or gifts: [{ username, blockedAt }]
    blocked: overrides.blocked ?? [],
    notifications: overrides.notifications ?? [],
    transactions: overrides.transactions ?? [],
    wallet: overrides.wallet ?? { balance: 0 },
    redeemedCodes: [],
    seenSales: {},
    seenReleases: {},
    // { [gameSlug]: { [dlcId]: { purchasedAt, playtimeAtPurchase } } }
    dlc: overrides.dlc ?? {},
    usedCoupons: [],
    // { salt, hash } once a password is set (see lib/password.js)
    credentials: overrides.credentials ?? null,
    // First-visit checklist: { dismissed, done: { [step]: time } } (see TOUR_STEPS)
    tour: { dismissed: false, done: {} },
  }
}

// The demo account comes with a few games, friends and a purchase history so the showcase isn't empty.
// Two of its installed games have updates waiting, and it updates manually so they stay visible.
export function demoAccount() {
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
    // A request waiting on the Friends page
    requests: { incoming: [{ username: 'retrofox', sentAt: now - 2 * HOUR }], outgoing: [] },
    notifications: [notification('friend', { title: 'RetroFox sent you a friend request', href: '/friends', createdAt: now - 2 * HOUR })],
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

export function initialState(prefs = DEFAULT_PREFS) {
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
    profile: { ...fresh.profile, ...account?.profile, status: STATUSES[account?.profile?.status] ? account.profile.status : 'online' },
    settings: { ...DEFAULT_SETTINGS, ...account?.settings, notify: { ...DEFAULT_SETTINGS.notify, ...account?.settings?.notify } },
    library,
    wishlist: list(account?.wishlist).filter(knownGame),
    collections: list(account?.collections).map((c) => ({ ...c, slugs: list(c.slugs).filter((slug) => getGame(slug)) })),
    friends: list(account?.friends).filter((f) => f?.username),
    requests: {
      incoming: list(account?.requests?.incoming).filter((r) => r?.username),
      outgoing: list(account?.requests?.outgoing).filter((r) => r?.username),
    },
    blocked: list(account?.blocked).filter((b) => b?.username),
    notifications: list(account?.notifications),
    transactions: list(account?.transactions),
    wallet: { balance: Number(account?.wallet?.balance) || 0 },
    redeemedCodes: list(account?.redeemedCodes),
    seenSales: account?.seenSales ?? {},
    seenReleases: account?.seenReleases ?? {},
    dlc: account?.dlc && typeof account.dlc === 'object' ? account.dlc : {},
    usedCoupons: list(account?.usedCoupons),
    credentials: account?.credentials?.salt && account.credentials.hash ? account.credentials : null,
    tour: { dismissed: Boolean(account?.tour?.dismissed), done: account?.tour?.done && typeof account.tour.done === 'object' ? account.tour.done : {} },
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

function sanitizePrefs(prefs) {
  const merged = { ...DEFAULT_PREFS, ...prefs }
  return {
    theme: THEMES[merged.theme] ? merged.theme : DEFAULT_PREFS.theme,
    currency: CURRENCIES[merged.currency] ? merged.currency : DEFAULT_PREFS.currency,
    birthDate: typeof merged.birthDate === 'string' ? merged.birthDate : null,
    sidebar: merged.sidebar === 'collapsed' ? 'collapsed' : 'expanded',
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

export function loadState() {
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
    if (session) accounts[session.username] = withStoreAlerts(accounts[session.username])
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
