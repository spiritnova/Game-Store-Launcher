import { afterEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '@/lib/storage-key'
import { befriend, dropRequests } from '@/lib/store/records'
import { initialState, loadState } from '@/lib/store/state'
import { account } from './helpers'

function stubStorage(items) {
  const store = new Map(Object.entries(items))
  vi.stubGlobal('localStorage', {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('loadState', () => {
  it('starts with the demo account when nothing is saved', () => {
    stubStorage({})
    const state = loadState()
    expect(state.session).toBeNull()
    expect(state.accounts.demo.library.length).toBeGreaterThan(0)
    expect(state.accounts.demo.requests.incoming).toHaveLength(1)
  })

  it('falls back to a fresh state when the saved data is corrupt', () => {
    stubStorage({ [STORAGE_KEY]: '{not json' })
    expect(Object.keys(loadState().accounts)).toEqual(Object.keys(initialState().accounts))
  })

  it('drops games that left the catalog and fills in missing fields', () => {
    const saved = {
      session: { username: 'sam' },
      accounts: { sam: { profile: { displayName: 'Sam', status: 'bogus' }, library: [{ slug: 'hades' }, { slug: 'not-a-game' }], cart: [] } },
      cart: [{ type: 'game', slug: 'not-a-game' }, { type: 'game', slug: 'hades', id: 'game:hades' }],
      coupon: 'NOT-A-COUPON',
    }
    stubStorage({ [STORAGE_KEY]: JSON.stringify(saved) })
    const state = loadState()
    const sam = state.accounts.sam
    expect(sam.library.map((e) => e.slug)).toEqual(['hades'])
    expect(sam.library[0].edition).toBe('standard')
    expect(sam.profile.status).toBe('online')
    expect(sam.requests).toEqual({ incoming: [], outgoing: [] })
    expect(state.cart).toHaveLength(1)
    expect(state.coupon).toBeNull()
  })

  it('signs out a session whose account no longer exists', () => {
    stubStorage({ [STORAGE_KEY]: JSON.stringify({ session: { username: 'ghost' }, accounts: {} }) })
    expect(loadState().session).toBeNull()
  })
})

describe('friend lists', () => {
  it('befriending clears pending requests both ways', () => {
    const me = account({ requests: { incoming: [{ username: 'a', sentAt: 1 }], outgoing: [{ username: 'a', sentAt: 2 }, { username: 'b', sentAt: 3 }] } })
    const next = befriend(me, 'a', 10)
    expect(next.friends).toEqual([{ username: 'a', since: 10 }])
    expect(next.requests).toEqual({ incoming: [], outgoing: [{ username: 'b', sentAt: 3 }] })
    expect(befriend(next, 'a', 20).friends).toHaveLength(1)
  })

  it('dropRequests removes one player only', () => {
    const requests = { incoming: [{ username: 'a' }, { username: 'b' }], outgoing: [{ username: 'a' }] }
    expect(dropRequests(requests, 'a')).toEqual({ incoming: [{ username: 'b' }], outgoing: [] })
  })
})
