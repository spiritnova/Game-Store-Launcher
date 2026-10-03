import { describe, expect, it } from 'vitest'
import { releaseTime, getGame } from '@/lib/games'
import { refundCheck } from '@/lib/store/commerce'
import { DAY, NOW, owner } from './helpers'

describe('refundCheck', () => {
  it('allows refunds within 14 days and under 2 hours of play', () => {
    const check = refundCheck(owner('hades', { daysAgo: 3, minutes: 30 }), 'hades', null, NOW)
    expect(check.eligible).toBe(true)
    expect(check.total).toBe(20)
  })

  it('refuses games bought more than 14 days ago', () => {
    const check = refundCheck(owner('hades', { daysAgo: 20 }), 'hades', null, NOW)
    expect(check.eligible).toBe(false)
    expect(check.reason).toMatch(/bought more than 14 days ago/)
  })

  it('refuses games played for 2 hours or more', () => {
    const check = refundCheck(owner('hades', { minutes: 120 }), 'hades', null, NOW)
    expect(check.eligible).toBe(false)
    expect(check.reason).toMatch(/2 hours/)
  })

  it('refuses gifts and free games', () => {
    expect(refundCheck(owner('hades', { giftFrom: 'someone' }), 'hades', null, NOW).eligible).toBe(false)
    expect(refundCheck(owner('counter-strike-2', { price: 0 }), 'counter-strike-2', null, NOW).reason).toMatch(/Free/)
  })

  it('returns null for games you don’t own', () => {
    expect(refundCheck(owner('hades'), 'the-witcher-3', null, NOW)).toBeNull()
  })

  it('lets pre-orders be refunded any time before release, then 14 days after', () => {
    const slug = 'gears-of-war-e-day'
    const release = releaseTime(getGame(slug))
    const preorder = owner(slug, { daysAgo: 0 })
    // Bought 60 days before release
    preorder.transactions[0].createdAt = release - 60 * DAY
    expect(refundCheck(preorder, slug, null, release - DAY).eligible).toBe(true)
    expect(refundCheck(preorder, slug, null, release + 10 * DAY).eligible).toBe(true)
    const late = refundCheck(preorder, slug, null, release + 20 * DAY)
    expect(late.eligible).toBe(false)
    expect(late.reason).toMatch(/released more than 14 days ago/)
  })

  it('doesn’t refund DLC that came with the edition', () => {
    const check = refundCheck(owner('the-witcher-3', { edition: 'complete' }), 'the-witcher-3', 'hearts-of-stone', NOW)
    expect(check.eligible).toBe(false)
    expect(check.reason).toMatch(/came with your edition/)
  })
})
