// Pricing the cart and checking refunds. Pure functions of the saved state.
import { applyCoupon } from '@/lib/coupons'
import { formatMoney } from '@/lib/currency'
import { bundlePrice, currentPrice, dlcPrice, editionDlc, editionPrice, getBundle, getDlc, getEdition, getGame, isReleased, releaseTime, upgradePrice } from '@/lib/games'
import { playerOwns } from '@/lib/players'
import { toCents } from './records'
import { GIFT_CODES, REFUND_DAYS, REFUND_MINUTES } from './settings'

const DAY = 24 * 60 * 60 * 1000

// DLC an account owns for a game: bought separately, or included with its edition
export function ownedDlc(account, slug) {
  const entry = account?.library.find((e) => e.slug === slug)
  const bought = Object.keys(account?.dlc?.[slug] ?? {})
  const included = entry ? editionDlc(getGame(slug), entry.edition) : []
  return { bought, included, all: [...new Set([...included, ...bought])] }
}

// Whether a purchase of a game (or one of its DLC, with `dlcId`) can still be refunded: bought in the
// last 14 days and played less than 2 hours (for DLC, since it was bought).
export function refundCheck(account, slug, dlcId = null, now = Date.now()) {
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
  // Pre-orders can be refunded any time before release, and for the usual 14 days after it
  const deadline = Math.max(transaction.createdAt, dlcId ? 0 : releaseTime(getGame(slug))) + REFUND_DAYS * DAY
  const played = (entry?.playtimeMinutes ?? 0) - (dlcId ? account.dlc[slug][dlcId].playtimeAtPurchase ?? 0 : 0)
  // Refunding a game also refunds edition upgrades bought for it
  const upgrades = dlcId
    ? []
    : account.transactions.flatMap((t) => (t.type === 'purchase' ? t.items.filter((i) => i.slug === slug && i.upgrade && !i.refunded).map((i) => ({ transaction: t, item: i })) : []))
  const total = toCents(item.price + upgrades.reduce((sum, u) => sum + u.item.price, 0))
  const info = { transaction, item, amount: item.price, upgrades, total, method: transaction.method, deadline }
  if (item.price === 0) return { ...info, eligible: false, reason: `Free ${thing === 'game' ? 'games' : 'DLC'} can’t be refunded.` }
  if (now > deadline) {
    const preordered = !dlcId && releaseTime(getGame(slug)) > transaction.createdAt
    return { ...info, eligible: false, reason: `It was ${preordered ? 'released' : 'bought'} more than ${REFUND_DAYS} days ago.` }
  }
  if (played >= REFUND_MINUTES) return { ...info, eligible: false, reason: `It has been played for ${REFUND_MINUTES / 60} hours or more${dlcId ? ' since it was bought' : ''}.` }
  return { ...info, eligible: true }
}

// What the cart costs for the signed-in account (or a visitor): one line per game, DLC or upgrade
// actually being bought (bundles are split per game), with the coupon split across the lines.
// Shared by the cart, which previews it, and checkout, which charges it.
export function priceCart(d) {
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
      const line = { slug: game.slug, edition: edition.id, title: game.title, editionName: edition.name, original: edition.price, price, ...(isReleased(game) ? {} : { preorder: true }) }
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
