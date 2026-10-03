import { demoReply, MESSAGE_MAX, replyDelay, threadId } from '@/lib/chat'
import { getPlayer } from '@/lib/players'
import { notification, pushNotification, without } from '../records'

const excerpt = (text) => (text.length > 80 ? `${text.slice(0, 79)}…` : text)
const messageId = (now) => `${now}-${Math.random().toString(36).slice(2, 7)}`

// Messages between friends. Demo players answer a few seconds later (see resolveReplies); other accounts
// in this browser read them when they next log in.
// `ctx` holds the state setters, refs and helpers shared by all actions (built in index.js).
export function messageActions({ dataRef, setData, accountOf, username, updateAccount, viewingRef }) {
  return {
    // Returns { ok, message? }
    sendMessage(name, text) {
      const me = accountOf(dataRef.current)
      const myName = username()
      if (!me) return { ok: false, message: 'Sign in to send messages.' }
      const body = text.trim().slice(0, MESSAGE_MAX)
      if (!body) return { ok: false }
      if (!me.friends.some((f) => f.username === name)) return { ok: false, message: 'You can only message your friends.' }
      const now = Date.now()
      const id = threadId(myName, name)
      const demo = !dataRef.current.accounts[name] && Boolean(getPlayer(name))
      setData((d) => {
        const thread = [...(d.messages[id] ?? []), { id: messageId(now), from: myName, text: body, sentAt: now }].slice(-200)
        const accounts = { ...d.accounts }
        const mine = accounts[myName]
        accounts[myName] = {
          ...mine,
          lastRead: { ...mine.lastRead, [id]: now },
          // A demo player answers your latest message
          pendingReplies: demo
            ? [...without(mine.pendingReplies, name), { username: name, text: body, count: thread.length, dueAt: now + replyDelay(name, thread.length) }]
            : mine.pendingReplies,
        }
        if (accounts[name]) {
          accounts[name] = pushNotification(
            accounts[name],
            notification('message', { title: `${mine.profile.displayName} sent you a message`, body: excerpt(body), href: `/messages?with=${myName}` })
          )
        }
        return { ...d, messages: { ...d.messages, [id]: thread }, accounts }
      })
      return { ok: true }
    },

    // Demo players' replies that are due. Called on a timer while any are pending.
    resolveReplies() {
      const me = accountOf(dataRef.current)
      const myName = username()
      const now = Date.now()
      if (!me || !me.pendingReplies.some((r) => r.dueAt <= now)) return
      setData((d) => {
        let account = d.accounts[myName]
        if (!account) return d
        const due = account.pendingReplies.filter((r) => r.dueAt <= now)
        account = { ...account, pendingReplies: account.pendingReplies.filter((r) => r.dueAt > now) }
        let messages = d.messages
        for (const r of due) {
          // Unfriended or blocked since: no reply
          if (!account.friends.some((f) => f.username === r.username)) continue
          const id = threadId(myName, r.username)
          const reply = { id: messageId(now), from: r.username, text: demoReply(r.username, r.text, r.count), sentAt: now }
          messages = { ...messages, [id]: [...(messages[id] ?? []), reply].slice(-200) }
          if (viewingRef.current === r.username) {
            account = { ...account, lastRead: { ...account.lastRead, [id]: now } }
          } else {
            account = pushNotification(
              account,
              notification('message', { title: `${getPlayer(r.username).displayName} replied`, body: excerpt(reply.text), href: `/messages?with=${r.username}` })
            )
          }
        }
        return { ...d, messages, accounts: { ...d.accounts, [myName]: account } }
      })
    },

    // Marks a conversation (and its notifications) as read
    markThreadRead(name) {
      const id = threadId(username(), name)
      const href = `/messages?with=${name}`
      updateAccount((acc) => ({
        ...acc,
        lastRead: { ...acc.lastRead, [id]: Date.now() },
        notifications: acc.notifications.map((n) => (n.type === 'message' && n.href === href && !n.read ? { ...n, read: true } : n)),
      }))
    },

    // The conversation on screen, so replies to it arrive already read
    setViewing(name) {
      viewingRef.current = name
    },
  }
}
