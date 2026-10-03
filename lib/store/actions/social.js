import { isReleased } from '@/lib/games'
import { getPlayer } from '@/lib/players'
import { acceptDelay, befriend, completeStep, dropRequests, notification, pushNotification, without } from '../records'
import { STATUSES } from '../settings'

// Notifications, friends and friend requests, reviews and comments.
// `ctx` holds the state setters, refs and helpers shared by all actions (built in index.js).
export function socialActions({ dataRef, setData, toast, accountOf, username, updateAccount, updateOther, updateCommunity, findUser, promptSignIn }) {
  const actions = {
    // ---------- Notifications ----------
    notify(type, fields) {
      if (!username()) return
      updateAccount((acc) => pushNotification(acc, notification(type, fields)))
    },
    markNotificationsRead(ids) {
      updateAccount((acc) => ({ ...acc, notifications: acc.notifications.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)) }))
    },
    removeNotification(id) {
      updateAccount((acc) => ({ ...acc, notifications: acc.notifications.filter((n) => n.id !== id) }))
    },
    clearNotifications() {
      updateAccount((acc) => ({ ...acc, notifications: [] }))
    },

    // ---------- Friends ----------
    // Sends a friend request, or accepts theirs if they already sent one. Demo players accept after a few
    // seconds (see resolveRequests); other accounts in this browser answer when they next log in.
    // Returns { ok, message }.
    sendFriendRequest(name) {
      const me = accountOf(dataRef.current)
      if (!me) return { ok: false, message: 'Sign in to add friends.' }
      const user = findUser(name)
      if (!user) return { ok: false, message: `No player called “${name.trim()}” was found.` }
      const myName = username()
      const has = (items) => items.some((item) => item.username === user.username)
      if (user.username === myName) return { ok: false, message: 'That’s you!' }
      if (has(me.friends)) return { ok: false, message: `You and ${user.displayName} are already friends.` }
      if (has(me.blocked)) return { ok: false, message: `You blocked ${user.displayName}. Unblock them to send a request.` }
      if (has(me.requests.incoming)) return actions.acceptFriendRequest(user.username)
      if (has(me.requests.outgoing)) return { ok: false, message: `You already sent ${user.displayName} a friend request.` }
      const sentAt = Date.now()
      updateAccount((acc) => ({ ...acc, requests: { ...acc.requests, outgoing: [...acc.requests.outgoing, { username: user.username, sentAt }] } }))
      // Someone who blocked you isn't told about the request; it just stays pending on your side
      const theyBlocked = user.local && dataRef.current.accounts[user.username].blocked.some((b) => b.username === myName)
      if (user.local && !theyBlocked) {
        updateOther(user.username, (acc) =>
          pushNotification(
            { ...acc, requests: { ...acc.requests, incoming: [...without(acc.requests.incoming, myName), { username: myName, sentAt }] } },
            notification('friend', { title: `${me.profile.displayName} sent you a friend request`, href: '/friends' })
          )
        )
      }
      const message = `Friend request sent to ${user.displayName}.`
      toast({ message })
      return { ok: true, message }
    },
    acceptFriendRequest(name) {
      const me = accountOf(dataRef.current)
      const user = findUser(name)
      if (!me || !user || !me.requests.incoming.some((r) => r.username === user.username)) {
        return { ok: false, message: 'That friend request is no longer available.' }
      }
      const myName = username()
      const since = Date.now()
      updateAccount((acc) => completeStep(befriend(acc, user.username, since), 'friend'))
      if (user.local) {
        updateOther(user.username, (acc) =>
          pushNotification(befriend(acc, myName, since), notification('friend', { title: `${me.profile.displayName} accepted your friend request`, href: `/u/${myName}` }))
        )
      }
      const message = `You and ${user.displayName} are now friends.`
      toast({ message, href: `/u/${user.username}`, actionLabel: 'View profile' })
      return { ok: true, message }
    },
    // Declining isn't announced to the other player
    declineFriendRequest(name) {
      const myName = username()
      const user = findUser(name)
      updateAccount((acc) => ({ ...acc, requests: dropRequests(acc.requests, name) }))
      if (user?.local) updateOther(name, (acc) => ({ ...acc, requests: dropRequests(acc.requests, myName) }))
      if (user) toast({ message: `Declined ${user.displayName}’s friend request.` })
    },
    cancelFriendRequest(name) {
      const myName = username()
      const user = findUser(name)
      updateAccount((acc) => ({ ...acc, requests: dropRequests(acc.requests, name) }))
      if (user?.local) updateOther(name, (acc) => ({ ...acc, requests: dropRequests(acc.requests, myName) }))
      if (user) toast({ message: `Cancelled your friend request to ${user.displayName}.` })
    },
    // Demo players accept requests a few seconds after they're sent. Called on a timer while any are pending.
    resolveRequests() {
      const me = accountOf(dataRef.current)
      if (!me) return
      const now = Date.now()
      const ready = me.requests.outgoing.filter((r) => !dataRef.current.accounts[r.username] && getPlayer(r.username) && now >= r.sentAt + acceptDelay(r.username))
      if (ready.length === 0) return
      updateAccount((acc) => {
        const next = ready.reduce(
          (account, r) => pushNotification(befriend(account, r.username, now), notification('friend', { title: `${getPlayer(r.username).displayName} accepted your friend request`, href: `/u/${r.username}` })),
          acc
        )
        return completeStep(next, 'friend')
      })
      for (const r of ready) {
        toast({ message: `${getPlayer(r.username).displayName} accepted your friend request.`, href: `/u/${r.username}`, actionLabel: 'View profile' })
      }
    },
    removeFriend(name) {
      const myName = username()
      const user = findUser(name)
      updateAccount((acc) => ({ ...acc, friends: without(acc.friends, name) }))
      if (user?.local) updateOther(name, (acc) => ({ ...acc, friends: without(acc.friends, myName) }))
      if (user) toast({ message: `Removed ${user.displayName} from your friends.` })
    },
    // Blocking also ends the friendship, drops requests both ways and removes gifts for them from the cart.
    blockPlayer(name) {
      const myName = username()
      const user = findUser(name)
      if (!myName || !user || user.username === myName) return
      setData((d) => {
        const accounts = { ...d.accounts }
        const mine = accounts[myName]
        accounts[myName] = {
          ...mine,
          friends: without(mine.friends, name),
          requests: dropRequests(mine.requests, name),
          blocked: [...without(mine.blocked, name), { username: name, blockedAt: Date.now() }],
        }
        if (accounts[name]) accounts[name] = { ...accounts[name], friends: without(accounts[name].friends, myName), requests: dropRequests(accounts[name].requests, myName) }
        return { ...d, accounts, cart: d.cart.filter((item) => item.gift?.to !== name) }
      })
      toast({ message: `Blocked ${user.displayName}. They can’t send you friend requests or gifts.` })
    },
    unblockPlayer(name) {
      const user = findUser(name)
      updateAccount((acc) => ({ ...acc, blocked: without(acc.blocked, name) }))
      toast({ message: `Unblocked ${user?.displayName ?? name}.` })
    },
    setStatus(status) {
      if (!STATUSES[status]) return
      updateAccount((acc) => ({ ...acc, profile: { ...acc.profile, status } }))
    },

    // ---------- Community ----------
    submitReview(game, { recommended, text }) {
      const acc = accountOf(dataRef.current)
      if (!acc) return promptSignIn('Sign in to write a review.')
      const entry = acc.library.find((e) => e.slug === game.slug)
      if (!entry) return toast({ message: `Only players who own ${game.title} can review it.` })
      if (!isReleased(game)) return toast({ message: `You can review ${game.title} once it’s released.` })
      const name = username()
      const review = {
        id: `${name}-${game.slug}`,
        author: { username: name },
        recommended,
        text: text.trim(),
        hoursPlayed: Math.round(entry.playtimeMinutes / 60),
        createdAt: new Date().toISOString(),
      }
      updateCommunity((c) => ({
        ...c,
        reviews: { ...c.reviews, [game.slug]: [review, ...(c.reviews[game.slug] ?? []).filter((r) => r.author.username !== name)] },
      }))
      toast({ message: 'Thanks! Your review was posted.' })
    },
    deleteReview(game) {
      const name = username()
      updateCommunity((c) => ({
        ...c,
        reviews: { ...c.reviews, [game.slug]: (c.reviews[game.slug] ?? []).filter((r) => r.author.username !== name) },
      }))
      toast({ message: 'Your review was deleted.' })
    },
    toggleHelpful(reviewId) {
      const name = username()
      if (!name) return promptSignIn('Sign in to rate reviews.')
      updateCommunity((c) => {
        const voters = c.helpful[reviewId] ?? []
        const next = voters.includes(name) ? voters.filter((v) => v !== name) : [...voters, name]
        return { ...c, helpful: { ...c.helpful, [reviewId]: next } }
      })
    },
    addComment(game, text) {
      const name = username()
      if (!name) return promptSignIn('Sign in to join the discussion.')
      const comment = { id: `${name}-${Date.now()}`, author: { username: name }, text: text.trim(), createdAt: new Date().toISOString() }
      updateCommunity((c) => ({ ...c, comments: { ...c.comments, [game.slug]: [comment, ...(c.comments[game.slug] ?? [])] } }))
    },
    deleteComment(game, commentId) {
      updateCommunity((c) => ({
        ...c,
        comments: { ...c.comments, [game.slug]: (c.comments[game.slug] ?? []).filter((item) => item.id !== commentId) },
      }))
    },
  }
  return actions
}
