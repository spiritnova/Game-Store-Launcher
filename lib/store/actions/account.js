import { getBundle, getEdition, getGame } from '@/lib/games'
import { checkPassword, makeCredentials } from '@/lib/password'
import { getPlayer } from '@/lib/players'
import { ownedDlc } from '../commerce'
import { dropRequests, without, withStoreAlerts } from '../records'
import { DEMO_PASSWORD, DEMO_USER, PASSWORD_MIN, USERNAME_PATTERN } from '../settings'
import { demoAccount, initialState, newAccount } from '../state'

export function accountActions({ dataRef, setData, toast, accountOf, username, updateAccount, updateOther, stopPlaying }) {
  function signOutCurrent() {
    stopPlaying({ quiet: true })
    const name = username()
    if (name) updateAccount((acc) => ({ ...acc, profile: { ...acc.profile, lastSeen: Date.now() } }))
    return name
  }

  const actions = {
    // Opens a session for an account. Login and registration check the password first;
    // "Continue as demo player" calls this directly.
    signIn({ username: name, displayName, account }) {
      const key = name.trim().toLowerCase()
      if (dataRef.current.session?.username !== key) signOutCurrent()
      const existing = account ?? dataRef.current.accounts[key]
      const acc = withStoreAlerts(existing ?? (key === DEMO_USER.username ? demoAccount() : newAccount(displayName?.trim() || name.trim())))
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
    // Returns { ok, message }. Accounts made before passwords existed adopt the first password used.
    async logIn({ username: name, password }) {
      const key = name.trim().toLowerCase()
      const wrong = { ok: false, message: 'That username and password don’t match an account.' }
      if (key === DEMO_USER.username) {
        if (password !== DEMO_PASSWORD) return wrong
        actions.signIn(DEMO_USER)
        return { ok: true }
      }
      const existing = dataRef.current.accounts[key]
      if (!existing) return wrong
      if (!existing.credentials) {
        const account = { ...existing, credentials: await makeCredentials(password) }
        actions.signIn({ username: key, account })
        return { ok: true, message: 'This account had no password yet, so the one you entered is now its password.' }
      }
      if (!(await checkPassword(password, existing.credentials))) return wrong
      actions.signIn({ username: key })
      return { ok: true }
    },
    // Returns { ok, field?, message }
    async register({ username: name, displayName, password }) {
      const key = name.trim().toLowerCase()
      if (!USERNAME_PATTERN.test(key)) return { ok: false, field: 'username', message: 'Use 3–20 letters, numbers, dots, dashes or underscores.' }
      if (dataRef.current.accounts[key] || getPlayer(key) || key === DEMO_USER.username) {
        return { ok: false, field: 'username', message: 'That username is taken. Try another one.' }
      }
      if (password.length < PASSWORD_MIN) return { ok: false, field: 'password', message: `Use at least ${PASSWORD_MIN} characters.` }
      const account = newAccount(displayName.trim() || name.trim(), { credentials: await makeCredentials(password) })
      actions.signIn({ username: key, account })
      return { ok: true }
    },
    // Returns { ok, field?, message }. Accounts without a password yet can set one without `current`.
    async changePassword({ current, next }) {
      const name = username()
      const acc = accountOf(dataRef.current)
      if (!acc) return { ok: false, message: 'Sign in to change your password.' }
      if (name === DEMO_USER.username) return { ok: false, message: `The demo account’s password is always “${DEMO_PASSWORD}” so anyone can try the launcher.` }
      if (acc.credentials && !(await checkPassword(current, acc.credentials))) return { ok: false, field: 'current', message: 'That isn’t your current password.' }
      if (next.length < PASSWORD_MIN) return { ok: false, field: 'next', message: `Use at least ${PASSWORD_MIN} characters.` }
      if (acc.credentials && (await checkPassword(next, acc.credentials))) return { ok: false, field: 'next', message: 'That’s your current password. Choose a new one.' }
      const credentials = await makeCredentials(next)
      // By name rather than session, in case the session changed while hashing
      updateOther(name, (a) => ({ ...a, credentials }))
      const message = acc.credentials ? 'Your password was changed.' : 'Your password was set.'
      toast({ message })
      return { ok: true, message }
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
          if (other !== name) accounts[other] = { ...acc, friends: without(acc.friends, name), requests: dropRequests(acc.requests, name), blocked: without(acc.blocked, name) }
        }
        const byOthers = (items) => items.filter((item) => item.author.username !== name)
        const reviews = Object.fromEntries(Object.entries(d.community.reviews).map(([slug, items]) => [slug, byOthers(items)]))
        const comments = Object.fromEntries(Object.entries(d.community.comments).map(([slug, items]) => [slug, byOthers(items)]))
        // Their conversations go too
        const messages = Object.fromEntries(Object.entries(d.messages).filter(([id]) => !id.split(':').includes(name)))
        return { ...d, session: null, accounts, community: { ...d.community, reviews, comments }, messages }
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

    resetDemo() {
      stopPlaying({ quiet: true })
      setData((d) => initialState(d.prefs))
      toast({ message: 'Demo data was reset and you were signed out.' })
    },
  }
  return actions
}
