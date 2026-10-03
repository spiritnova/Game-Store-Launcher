import { describe, expect, it } from 'vitest'
import { bundlePrice, currentPrice, getBundle, getEdition, getGame, upgradePrice } from '@/lib/games'
import { DEMO_PLAYERS } from '@/lib/players'
import { priceCart } from '@/lib/store/commerce'
import { account, gameItem, owner, state } from './helpers'

const total = (items) => Math.round(items.reduce((sum, item) => sum + item.price, 0) * 100) / 100

describe('priceCart', () => {
  it('charges the current (sale) price and skips games you already own', () => {
    const rdr2 = getGame('red-dead-redemption-2')
    const result = priceCart(state({ me: owner('hades'), cart: [gameItem('red-dead-redemption-2'), gameItem('hades')] }))
    expect(result.items).toHaveLength(1)
    expect(result.items[0].price).toBe(currentPrice(rdr2))
    expect(result.total).toBe(currentPrice(rdr2))
  })

  it('splits a bundle across the games you don’t own, adding up to the bundle price', () => {
    const bundle = getBundle('open-world-legends')
    const me = owner('the-witcher-3')
    const result = priceCart(state({ me, cart: [{ id: 'bundle', type: 'bundle', slug: bundle.slug }] }))
    const expected = bundlePrice(bundle, (slug) => slug === 'the-witcher-3')
    expect(result.items.map((i) => i.slug)).not.toContain('the-witcher-3')
    expect(result.items).toHaveLength(bundle.games.length - 1)
    expect(total(result.items)).toBe(expected.price)
  })

  it('only sells DLC with its game, owned or in the same order', () => {
    const dlc = { id: 'dlc', type: 'dlc', slug: 'the-witcher-3', dlc: 'hearts-of-stone' }
    expect(priceCart(state({ cart: [dlc] })).items).toHaveLength(0)
    expect(priceCart(state({ me: owner('the-witcher-3'), cart: [dlc] })).items).toHaveLength(1)
  })

  it('doesn’t sell DLC that comes with your edition', () => {
    const me = owner('the-witcher-3', { edition: 'complete' })
    const cart = [{ id: 'dlc', type: 'dlc', slug: 'the-witcher-3', dlc: 'hearts-of-stone' }]
    expect(priceCart(state({ me, cart })).items).toHaveLength(0)
  })

  it('prices an edition upgrade at the difference, crediting DLC you bought', () => {
    const game = getGame('the-witcher-3')
    const me = { ...owner('the-witcher-3'), dlc: { 'the-witcher-3': { 'hearts-of-stone': { purchasedAt: 0, playtimeAtPurchase: 0 } } } }
    const result = priceCart(state({ me, cart: [{ id: 'up', type: 'upgrade', slug: 'the-witcher-3', edition: 'complete' }] }))
    const expected = upgradePrice(game, 'standard', 'complete', ['hearts-of-stone'])
    expect(expected.credit).toBeGreaterThan(0)
    expect(result.items[0].price).toBe(expected.price)
  })

  it('skips gifts for players who already own the game', () => {
    const player = DEMO_PLAYERS[0]
    const theirs = player.library[0].slug
    const cart = [gameItem(theirs, { id: 'gift', gift: { to: player.username, message: '' } })]
    expect(priceCart(state({ cart })).items).toHaveLength(0)
  })

  it('marks unreleased games as pre-orders', () => {
    const result = priceCart(state({ cart: [gameItem('gears-of-war-e-day')] }))
    // Gears of War: E-Day came out on Oct 6, 2026; before that it's a pre-order
    expect(Boolean(result.items[0].preorder)).toBe(Date.now() < Date.UTC(2026, 9, 6))
  })

  it('applies a coupon so the line prices add up to the total', () => {
    const cart = [gameItem('hades'), gameItem('red-dead-redemption-2')]
    const before = priceCart(state({ cart })).total
    const result = priceCart(state({ cart, coupon: 'SAVE10' }))
    expect(result.coupon.ok).toBe(true)
    expect(result.total).toBe(Math.round((before - result.coupon.discount) * 100) / 100)
    expect(total(result.items)).toBe(result.total)
  })

  it('works for visitors who aren’t signed in', () => {
    const result = priceCart({ session: null, accounts: {}, cart: [gameItem('hades')], coupon: null, prefs: { currency: 'USD' } })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].editionName).toBe(getEdition(getGame('hades')).name)
  })

  it('handles an empty cart', () => {
    expect(priceCart(state({ me: account() })).total).toBe(0)
  })
})
