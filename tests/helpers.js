// Builders for test accounts and carts, on top of the store's own record helpers.
import { libraryEntry, purchaseRecord } from '@/lib/store/records'
import { newAccount } from '@/lib/store/state'

export const DAY = 24 * 60 * 60 * 1000
// A fixed "now" so tests don't depend on the date they run
export const NOW = Date.UTC(2026, 9, 1, 12)

export function account(overrides = {}) {
  return newAccount('Tester', overrides)
}

// An account that bought `slug` (`daysAgo` days before NOW) and played it for `minutes`
export function owner(slug, { daysAgo = 1, minutes = 0, price = 20, method = 'card', edition = 'standard', ...entry } = {}) {
  const purchasedAt = NOW - daysAgo * DAY
  return account({
    library: [libraryEntry(slug, { purchasedAt, playtimeMinutes: minutes, edition, ...entry })],
    transactions: [purchaseRecord(purchasedAt, method, slug, edition, price)],
  })
}

// The state shape priceCart() reads
export function state({ me = account(), cart = [], coupon = null, accounts = {} } = {}) {
  return { session: { username: 'tester' }, accounts: { tester: me, ...accounts }, cart, coupon, prefs: { currency: 'USD' } }
}

export const gameItem = (slug, fields = {}) => ({ id: `game:${slug}`, type: 'game', slug, edition: 'standard', ...fields })
