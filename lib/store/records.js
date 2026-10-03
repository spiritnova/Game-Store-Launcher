import { discountPercent, dlcPrice, getEdition, getGame, isOnSale, isReleased, releaseTime } from '@/lib/games'
import { hash } from '@/lib/random'
import { NOTIFICATION_SETTINGS } from './settings'

export const uid = () => Math.random().toString(36).slice(2, 8)
export const transactionId = () => `UL-${Date.now().toString(36).slice(-5)}${uid().slice(0, 3)}`.toUpperCase()
export const toCents = (amount) => Math.round(amount * 100) / 100

export function libraryEntry(slug, fields = {}) {
  return { slug, edition: 'standard', purchasedAt: Date.now(), installed: false, playtimeMinutes: 0, lastPlayed: null, ...fields }
}

export const without = (items, name) => items.filter((item) => item.username !== name)
export const dropRequests = (requests, name) => ({ incoming: without(requests.incoming, name), outgoing: without(requests.outgoing, name) })
// Makes `name` a friend of `account` and clears any requests between them
export const befriend = (account, name, since) => ({ ...account, friends: [...without(account.friends, name), { username: name, since }], requests: dropRequests(account.requests, name) })
// How long a demo player takes to accept a friend request: 5-24 seconds, the same every time for a player
export const acceptDelay = (name) => (5 + (hash(`accept:${name}`) % 20)) * 1000

export function notification(type, fields) {
  return { id: `${type}-${Date.now()}-${uid()}`, type, createdAt: Date.now(), read: false, ...fields }
}

// Adds a notification to an account, unless the account turned that type off.
export function pushNotification(account, item) {
  const setting = Object.entries(NOTIFICATION_SETTINGS).find(([, s]) => s.types.includes(item.type))?.[0]
  if (setting && account.settings.notify?.[setting] === false) return account
  return { ...account, notifications: [item, ...account.notifications].slice(0, 50) }
}

// "A game on your wishlist is on sale" for every discounted wishlist game the account hasn't heard about yet.
// Checked when someone signs in or opens the launcher, like a store's sale email.
export function withSaleAlerts(account) {
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

// "Out now" for pre-orders that have unlocked and wishlisted games released since they were added.
// Checked with the sale alerts, when someone signs in or opens the launcher.
export function withReleaseAlerts(account, now = Date.now()) {
  const unlocked = account.library.filter((entry) => entry.preordered && isReleased(getGame(entry.slug), now))
  const wished = account.wishlist.filter((entry) => {
    const game = getGame(entry.slug)
    return isReleased(game, now) && releaseTime(game) > (entry.addedAt ?? 0) && !account.seenReleases[entry.slug]
  })
  if (unlocked.length === 0 && wished.length === 0) return account
  let next = {
    ...account,
    library: account.library.map((entry) => (unlocked.includes(entry) ? { ...entry, preordered: false } : entry)),
    seenReleases: { ...account.seenReleases, ...Object.fromEntries(wished.map((entry) => [entry.slug, true])) },
  }
  for (const entry of unlocked) {
    const game = getGame(entry.slug)
    next = pushNotification(next, notification('release', {
      slug: game.slug,
      title: `${game.title} is out now`,
      body: entry.installed ? 'Your pre-load is unlocked. Ready to play.' : 'Your pre-order is unlocked and ready to install.',
      href: `/games/${game.slug}`,
    }))
  }
  for (const entry of wished) {
    const game = getGame(entry.slug)
    next = pushNotification(next, notification('release', { slug: game.slug, title: `${game.title} is out now`, body: 'A game on your wishlist was just released.', href: `/games/${game.slug}` }))
  }
  return next
}

// The first-visit checklist (app/Components/Home/GettingStarted): steps tick off as the player tries them
export const TOUR_STEPS = ['buy', 'install', 'achievement', 'preorder', 'friend']

export function completeStep(account, step) {
  if (account.tour?.done?.[step]) return account
  return { ...account, tour: { ...account.tour, done: { ...account.tour?.done, [step]: Date.now() } } }
}

export const withStoreAlerts = (account) => withReleaseAlerts(withSaleAlerts(account))

export function purchaseRecord(createdAt, method, slug, editionId, price) {
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

export function dlcRecord(createdAt, method, slug, dlc) {
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
