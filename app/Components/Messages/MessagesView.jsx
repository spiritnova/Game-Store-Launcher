'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import SendIcon from '@mui/icons-material/Send'
import { MESSAGE_MAX, TYPING_MS } from '@/lib/chat'
import { useStore } from '@/lib/store'
import { useNow } from '@/lib/useNow'
import Avatar from '../UI/Avatar'
import Button from '../UI/Button'
import { PresenceDot, presenceLabel, usePresence } from '../UI/Presence'
import SignInPrompt from '../UI/SignInPrompt'
import Skeleton from '../UI/Skeleton'
import styles from './MessagesView.module.css'

const DAY = 24 * 60 * 60 * 1000
// Messages from the same person within 5 minutes are grouped under one timestamp
const GROUP_MS = 5 * 60 * 1000
// The character counter shows up this close to the limit
const COUNTER_FROM = MESSAGE_MAX - 100

const startOfDay = (t) => new Date(t).setHours(0, 0, 0, 0)
const time = (t) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

// "Today", "Yesterday", or the date, for the separators between days
function dayLabel(t, now) {
    const days = Math.round((startOfDay(now) - startOfDay(t)) / DAY)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return new Date(t).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

// A short time for the conversation list: the time today, the weekday this week, else the date
function shortTime(t, now) {
    const days = Math.round((startOfDay(now) - startOfDay(t)) / DAY)
    if (days === 0) return time(t)
    if (days < 7) return new Date(t).toLocaleDateString('en-US', { weekday: 'short' })
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Splits a thread into days, and each day into runs of messages from the same person
function groupMessages(messages) {
    const days = []
    for (const message of messages) {
        let day = days.at(-1)
        if (!day || startOfDay(day.start) !== startOfDay(message.sentAt)) {
            day = { start: message.sentAt, groups: [] }
            days.push(day)
        }
        const group = day.groups.at(-1)
        const previous = group?.messages.at(-1)
        if (group && group.from === message.from && message.sentAt - previous.sentAt < GROUP_MS) group.messages.push(message)
        else day.groups.push({ from: message.from, messages: [message] })
    }
    return days
}

function Conversations({ selected, now }) {
    const { session, friends, conversations, profileOf, pendingReplies } = useStore()
    const statusOf = usePresence()
    const talkedTo = new Set(conversations.map((c) => c.username))
    // Friends you haven't written to yet, so a conversation can be started from here
    const others = friends.filter((f) => !talkedTo.has(f.username)).map((f) => profileOf(f.username))

    const entry = (person, children) => {
        const status = statusOf(person.username, now)
        const active = person.username === selected
        return (
            <li key={person.username}>
                <Link
                    href={`/messages?with=${person.username}`}
                    className={`${styles.conversation} ${active ? styles.active : ''}`}
                    aria-current={active ? 'page' : undefined}
                >
                    <span className={styles.avatar}>
                        <Avatar user={person} size={40} />
                        <PresenceDot status={status} className={styles.dot} />
                    </span>
                    {children ?? (
                        <span className={styles.text}>
                            <span className={styles.name}>{person.displayName}</span>
                            <span className={styles.preview}>{presenceLabel(status)}</span>
                        </span>
                    )}
                </Link>
            </li>
        )
    }

    if (conversations.length === 0 && others.length === 0) {
        return (
            <div className={styles.listEmpty}>
                <p>Add friends to start chatting. Demo players write back within a few seconds.</p>
                <Button href="/friends" variant="secondary" size="small">Find friends</Button>
            </div>
        )
    }

    return (
        <>
            {conversations.length > 0 && (
                <ul className={styles.conversations} aria-label="Conversations">
                    {conversations.map(({ username, last, unread }) => {
                        const person = profileOf(username)
                        const typing = pendingReplies.some((r) => r.username === username && now >= r.dueAt - TYPING_MS)
                        return entry(person, (
                            <>
                                <span className={styles.text}>
                                    <span className={styles.nameRow}>
                                        <span className={`${styles.name} ${unread ? styles.unreadName : ''}`}>{person.displayName}</span>
                                        <time className={styles.when} dateTime={new Date(last.sentAt).toISOString()}>{shortTime(last.sentAt, now)}</time>
                                    </span>
                                    <span className={styles.nameRow}>
                                        <span className={`${styles.preview} ${typing ? styles.typingPreview : ''}`}>
                                            {typing ? 'typing…' : `${last.from === session.username ? 'You: ' : ''}${last.text}`}
                                        </span>
                                        {unread > 0 && (
                                            <span className={styles.unread}>
                                                {unread}
                                                <span className="visually-hidden"> unread</span>
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </>
                        ))
                    })}
                </ul>
            )}
            {others.length > 0 && (
                <>
                    <h2 className={styles.listTitle}>Start a conversation</h2>
                    <ul className={styles.conversations} aria-label="Friends">
                        {others.map((person) => entry(person))}
                    </ul>
                </>
            )}
        </>
    )
}

function Thread({ name, now, onBack }) {
    const { session, profileOf, isFriend, messagesWith, sendMessage, markThreadRead, setViewing, pendingReplies, conversations, notifications } = useStore()
    const statusOf = usePresence()
    const [draft, setDraft] = useState('')
    const [error, setError] = useState(null)
    const list = useRef(null)
    const input = useRef(null)
    const person = profileOf(name)
    const friend = isFriend(name)
    const messages = messagesWith(name)
    const status = statusOf(name, now)
    const unread = conversations.find((c) => c.username === name)?.unread ?? 0
    const pinged = notifications.some((n) => n.type === 'message' && n.href === `/messages?with=${name}` && !n.read)
    const reply = pendingReplies.find((r) => r.username === name)
    const typing = Boolean(reply) && now >= reply.dueAt - TYPING_MS

    // Replies to the open conversation arrive already read
    useEffect(() => {
        setViewing(name)
        return () => setViewing(null)
    }, [name, setViewing])

    useEffect(() => {
        if (unread > 0 || pinged) markThreadRead(name)
    }, [name, unread, pinged, markThreadRead])

    // A new conversation starts with a fresh draft
    useEffect(() => {
        setDraft('')
        setError(null)
    }, [name])

    // Keep the newest message in view
    useEffect(() => {
        if (list.current) list.current.scrollTop = list.current.scrollHeight
    }, [name, messages.length, typing])

    function send(e) {
        e?.preventDefault()
        const result = sendMessage(name, draft)
        if (result.ok) {
            setDraft('')
            setError(null)
        } else if (result.message) setError(result.message)
        input.current?.focus()
    }

    function onKeyDown(e) {
        // Enter sends, Shift+Enter adds a line (and Enter while an IME is composing does nothing)
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e)
    }

    return (
        <section className={styles.thread} aria-label={`Conversation with ${person.displayName}`}>
            <header className={styles.threadHeader}>
                <button type="button" className={styles.back} onClick={onBack} aria-label="Back to conversations">
                    <ArrowBackIcon fontSize="small" />
                </button>
                <Link href={`/u/${name}`} className={styles.who}>
                    <span className={styles.avatar}>
                        <Avatar user={person} size={40} />
                        <PresenceDot status={status} className={styles.dot} />
                    </span>
                    <span className={styles.text}>
                        <span className={styles.name}>{person.displayName}</span>
                        <span className={`${styles.preview} ${status.state === 'playing' ? styles.playing : ''}`}>{presenceLabel(status)}</span>
                    </span>
                </Link>
            </header>

            <div ref={list} className={styles.messages} role="log" aria-live="polite" aria-label="Messages">
                {messages.length === 0 && (
                    <p className={styles.threadEmpty}>
                        {friend ? `This is the start of your conversation with ${person.displayName}. Say hi!` : 'No messages yet.'}
                    </p>
                )}
                {groupMessages(messages).map((day) => (
                    <Fragment key={day.start}>
                        <p className={styles.day}><span>{dayLabel(day.start, now)}</span></p>
                        {day.groups.map((group) => {
                            const mine = group.from === session.username
                            return (
                                <div key={group.messages[0].id} className={`${styles.group} ${mine ? styles.mine : ''}`}>
                                    {!mine && <Avatar user={person} size={28} />}
                                    <div className={styles.bubbles}>
                                        <span className={styles.meta}>
                                            <span className="visually-hidden">{mine ? 'You' : person.displayName}, </span>
                                            {time(group.messages[0].sentAt)}
                                        </span>
                                        {group.messages.map((m) => <p key={m.id} className={styles.bubble}>{m.text}</p>)}
                                    </div>
                                </div>
                            )
                        })}
                    </Fragment>
                ))}
                {typing && (
                    <div className={styles.group}>
                        <Avatar user={person} size={28} />
                        <p className={`${styles.bubble} ${styles.typing}`}>
                            <span className={styles.typingDots} aria-hidden="true"><span /><span /><span /></span>
                            <span className="visually-hidden">{person.displayName} is typing…</span>
                        </p>
                    </div>
                )}
            </div>

            {friend ? (
                <form className={styles.composer} onSubmit={send}>
                    <label htmlFor="message-input" className="visually-hidden">Message {person.displayName}</label>
                    <textarea
                        ref={input}
                        id="message-input"
                        rows={1}
                        value={draft}
                        maxLength={MESSAGE_MAX}
                        placeholder={`Message ${person.displayName}`}
                        onChange={(e) => { setDraft(e.target.value); setError(null) }}
                        onKeyDown={onKeyDown}
                        aria-describedby="message-help"
                        aria-invalid={error ? true : undefined}
                    />
                    <Button type="submit" className={styles.send} disabled={!draft.trim()} aria-label="Send">
                        <SendIcon fontSize="small" />
                    </Button>
                    <p id="message-help" className={error ? styles.error : styles.hint} role={error ? 'alert' : undefined}>
                        {error ?? 'Enter to send, Shift+Enter for a new line'}
                        {!error && draft.length >= COUNTER_FROM && <span className={styles.counter}>{draft.length}/{MESSAGE_MAX}</span>}
                    </p>
                </form>
            ) : (
                <p className={styles.notFriend}>
                    You can only message your friends. <Link href={`/u/${name}`}>View {person.displayName}’s profile</Link>
                </p>
            )}
        </section>
    )
}

export default function MessagesView() {
    const { hydrated, session, unreadMessages, conversations, isFriend } = useStore()
    const router = useRouter()
    const now = useNow(500)
    const requested = useSearchParams().get('with')?.toLowerCase() || null

    const header = (
        <header className={styles.header}>
            <h1>Messages</h1>
            {hydrated && session && unreadMessages > 0 && <p>{unreadMessages} unread</p>}
        </header>
    )

    if (!hydrated) return <>{header}<Skeleton height="480px" radius="14px" /></>
    if (!session) {
        return (
            <>
                {header}
                <SignInPrompt title="Sign in to see your messages" text="Chat with your friends and plan your next co-op session." next="/messages" />
            </>
        )
    }

    // Open a conversation you have, or one with a friend; anything else (yourself, strangers) shows the list
    const selected =
        requested && requested !== session.username && (isFriend(requested) || conversations.some((c) => c.username === requested)) ? requested : null

    return (
        <>
            {header}
            <div className={`${styles.layout} ${selected ? styles.hasThread : ''}`}>
                <nav className={styles.list} aria-label="Conversations">
                    <Conversations selected={selected} now={now} />
                </nav>
                {selected ? (
                    <Thread name={selected} now={now} onBack={() => router.push('/messages')} />
                ) : (
                    <div className={`${styles.placeholder} ${requested ? styles.notice : ''}`}>
                        <ChatBubbleOutlineIcon className={styles.placeholderIcon} />
                        <h2>{requested ? 'You can only message your friends' : 'Your messages'}</h2>
                        <p>{requested ? 'Send them a friend request first, then come back here.' : 'Pick a conversation, or start one with a friend.'}</p>
                    </div>
                )}
            </div>
        </>
    )
}
