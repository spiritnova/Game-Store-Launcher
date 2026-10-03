import { describe, expect, it } from 'vitest'
import { canPreload, getGame, isReleased, PRELOAD_DAYS, releaseTime, upcomingGames } from '@/lib/games'
import { libraryEntry, withReleaseAlerts } from '@/lib/store/records'
import { getUpdate } from '@/lib/store/updates'
import { account, DAY } from './helpers'

const gears = getGame('gears-of-war-e-day')
const release = releaseTime(gears)

describe('release dates', () => {
  it('unlocks a game at its release date (midnight UTC)', () => {
    expect(isReleased(gears, release - 1)).toBe(false)
    expect(isReleased(gears, release)).toBe(true)
  })

  it(`opens pre-loading ${PRELOAD_DAYS} days early`, () => {
    expect(canPreload(gears, release - PRELOAD_DAYS * DAY - 1)).toBe(false)
    expect(canPreload(gears, release - PRELOAD_DAYS * DAY)).toBe(true)
  })

  it('lists upcoming games soonest first', () => {
    const upcoming = upcomingGames(Date.UTC(2026, 8, 1))
    expect(upcoming.length).toBeGreaterThan(0)
    expect(upcoming.map((g) => g.releaseDate)).toEqual([...upcoming.map((g) => g.releaseDate)].sort())
  })

  it('has no updates for pre-loaded games before release', () => {
    expect(getUpdate({ slug: gears.slug, installed: true, pendingUpdate: { sizeGB: 1 } })).toEqual(
      isReleased(gears) ? expect.objectContaining({ sizeGB: 1 }) : null
    )
  })
})

describe('withReleaseAlerts', () => {
  it('announces unlocked pre-orders once', () => {
    const me = account({ library: [libraryEntry(gears.slug, { preordered: true })] })
    const before = withReleaseAlerts(me, release - DAY)
    expect(before.notifications).toHaveLength(0)

    const after = withReleaseAlerts(me, release + DAY)
    expect(after.notifications[0].title).toMatch(/is out now/)
    expect(after.library[0].preordered).toBe(false)
    expect(withReleaseAlerts(after, release + 2 * DAY).notifications).toHaveLength(1)
  })

  it('announces wishlisted games released after they were added, once', () => {
    const me = account({ wishlist: [{ slug: gears.slug, addedAt: release - 30 * DAY }] })
    const after = withReleaseAlerts(me, release + DAY)
    expect(after.notifications).toHaveLength(1)
    expect(withReleaseAlerts(after, release + 2 * DAY).notifications).toHaveLength(1)
  })

  it('stays quiet about games that were already out when wishlisted', () => {
    const me = account({ wishlist: [{ slug: 'hades', addedAt: Date.now() }] })
    expect(withReleaseAlerts(me).notifications).toHaveLength(0)
  })

  it('respects the notification setting', () => {
    const me = account({ library: [libraryEntry(gears.slug, { preordered: true })] })
    me.settings = { ...me.settings, notify: { ...me.settings.notify, sales: false } }
    const after = withReleaseAlerts(me, release + DAY)
    expect(after.notifications).toHaveLength(0)
    expect(after.library[0].preordered).toBe(false)
  })
})
