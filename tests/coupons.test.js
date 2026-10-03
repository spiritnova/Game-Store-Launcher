import { describe, expect, it } from 'vitest'
import { applyCoupon } from '@/lib/coupons'

const lines = [
  { slug: 'hades', price: 24.99, type: 'game' },
  { slug: 'the-witcher-3', price: 39.99, type: 'game' },
  { slug: 'the-witcher-3', price: 19.99, type: 'dlc' },
]
const sum = (values) => Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100

describe('applyCoupon', () => {
  it('rejects unknown codes and points gift card codes to the wallet', () => {
    expect(applyCoupon('NOPE', lines).ok).toBe(false)
    const gift = applyCoupon('WELCOME-5', lines, { giftCodes: { 'WELCOME-5': 5 } })
    expect(gift.ok).toBe(false)
    expect(gift.message).toMatch(/gift card/)
  })

  it('is case- and whitespace-insensitive', () => {
    expect(applyCoupon('  save10 ', lines).code).toBe('SAVE10')
  })

  it('splits a percentage discount across lines, adding up to the whole discount', () => {
    const result = applyCoupon('SAVE10', lines)
    expect(result.discount).toBe(8.5)
    expect(sum(result.shares)).toBe(result.discount)
  })

  it('only discounts the lines a coupon covers', () => {
    const indie = applyCoupon('INDIE25', lines)
    expect(indie.shares[0]).toBeGreaterThan(0)
    expect(indie.shares.slice(1)).toEqual([0, 0])

    const addons = applyCoupon('ADDONS15', lines)
    expect(addons.shares).toEqual([0, 0, 3])
  })

  it('checks the minimum spend', () => {
    expect(applyCoupon('BIG15', lines.slice(0, 1)).ok).toBe(false)
    expect(applyCoupon('BIG15', lines).discount).toBe(15)
  })

  it('allows once-per-account coupons only once', () => {
    expect(applyCoupon('FIRSTPLAY', lines).ok).toBe(true)
    expect(applyCoupon('FIRSTPLAY', lines, { usedCoupons: ['FIRSTPLAY'] }).ok).toBe(false)
  })

  it('needs something in the cart it applies to', () => {
    expect(applyCoupon('ADDONS15', lines.slice(0, 2)).ok).toBe(false)
  })
})
