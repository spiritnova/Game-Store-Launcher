'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import CheckIcon from '@mui/icons-material/Check'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import { cardImage, getGame } from '@/lib/games'
import { DEMO_PLAYERS, getPlayer, playerLibrary } from '@/lib/players'
import { formatPlaytime, formatRelative, useStore } from '@/lib/store'
import { useNow } from '@/lib/useNow'
import Avatar from '../UI/Avatar'
import Button from '../UI/Button'
import { PresenceDot, presenceLabel, usePresence } from '../UI/Presence'
import SignInPrompt from '../UI/SignInPrompt'
import Skeleton from '../UI/Skeleton'
import styles from './FriendsView.module.css'

const GROUPS = [
    { id: 'playing', label: 'Playing now' },
    { id: 'online', label: 'Online' },
    { id: 'away', label: 'Away' },
    { id: 'offline', label: 'Offline' },
]

function AddFriend() {
    const { sendFriendRequest } = useStore()
    const [name, setName] = useState('')
    const [result, setResult] = useState(null)

    return (
        <form
            className={styles.add}
            onSubmit={(e) => {
                e.preventDefault()
                const outcome = sendFriendRequest(name)
                setResult(outcome)
                if (outcome.ok) setName('')
            }}
        >
            <label htmlFor="friend-name">Add a friend by username</label>
            <div className={styles.addRow}>
                <input
                    id="friend-name"
                    value={name}
                    autoComplete="off"
                    placeholder="e.g. lunabyte"
                    onChange={(e) => { setName(e.target.value); setResult(null) }}
                    aria-describedby="friend-help"
                    aria-invalid={result ? !result.ok : undefined}
                />
                <Button type="submit" variant="secondary" disabled={!name.trim()}>
                    <PersonAddAlt1Icon fontSize="small" /> Add
                </Button>
            </div>
            <p id="friend-help" className={result ? (result.ok ? styles.success : styles.error) : styles.muted} role={result ? 'status' : undefined}>
                {result?.message ?? 'Demo players answer within a few seconds. Other accounts in this browser see your request when they log in.'}
            </p>
        </form>
    )
}

function Requests() {
    const { incomingRequests, outgoingRequests, profileOf, acceptFriendRequest, declineFriendRequest, cancelFriendRequest } = useStore()
    if (incomingRequests.length === 0 && outgoingRequests.length === 0) return null
    const row = (request, actions) => {
        const person = profileOf(request.username)
        return (
            <li key={request.username} className={styles.request}>
                <Link href={`/u/${person.username}`} className={styles.requestPerson}>
                    <Avatar user={person} size={40} />
                    <span className={styles.text}>
                        <span className={styles.name}>{person.displayName}</span>
                        <span className={styles.status}>@{person.username} · {formatRelative(request.sentAt)}</span>
                    </span>
                </Link>
                <span className={styles.requestActions}>{actions(person)}</span>
            </li>
        )
    }

    return (
        <>
            {incomingRequests.length > 0 && (
                <section aria-labelledby="incoming-title" className={styles.group}>
                    <h2 id="incoming-title" className={styles.groupTitle}>Friend requests · {incomingRequests.length}</h2>
                    <ul className={styles.requests}>
                        {incomingRequests.map((request) => row(request, (person) => (
                            <>
                                <Button size="small" onClick={() => acceptFriendRequest(person.username)} aria-label={`Accept ${person.displayName}’s friend request`}>
                                    <CheckIcon fontSize="small" /> Accept
                                </Button>
                                <Button variant="ghost" size="small" onClick={() => declineFriendRequest(person.username)} aria-label={`Decline ${person.displayName}’s friend request`}>
                                    Decline
                                </Button>
                            </>
                        )))}
                    </ul>
                </section>
            )}
            {outgoingRequests.length > 0 && (
                <section aria-labelledby="outgoing-title" className={styles.group}>
                    <h2 id="outgoing-title" className={styles.groupTitle}>Sent requests · {outgoingRequests.length}</h2>
                    <ul className={styles.requests}>
                        {outgoingRequests.map((request) => row(request, (person) => (
                            <>
                                <span className={styles.pending}><HourglassEmptyIcon fontSize="inherit" /> Pending</span>
                                <Button variant="ghost" size="small" onClick={() => cancelFriendRequest(person.username)} aria-label={`Cancel your friend request to ${person.displayName}`}>
                                    Cancel
                                </Button>
                            </>
                        )))}
                    </ul>
                </section>
            )}
        </>
    )
}

export default function FriendsView() {
    const { hydrated, session, friends, accounts, profileOf, isFriend, isBlocked, requestWith, sendFriendRequest } = useStore()
    const statusOf = usePresence()
    const now = useNow(60000)

    const header = (
        <header className={styles.header}>
            <h1>Friends</h1>
            {hydrated && session && <p>{friends.length} {friends.length === 1 ? 'friend' : 'friends'}</p>}
        </header>
    )

    if (!hydrated) return <>{header}<Skeleton height="240px" radius="8px" /></>
    if (!session) {
        return (
            <>
                {header}
                <SignInPrompt title="Sign in to see your friends" text="See who’s online, what they’re playing, and send them gifts." next="/friends" />
            </>
        )
    }

    const people = friends.map((f) => ({ ...profileOf(f.username), since: f.since, status: statusOf(f.username, now) }))
    const grouped = GROUPS.map((g) => ({ ...g, people: people.filter((p) => p.status.state === g.id) })).filter((g) => g.people.length)

    // Suggestions: demo players and other accounts in this browser who aren't friends yet, haven't sent
    // you a request (those show above) and aren't blocked
    const suggestable = (name) => !isFriend(name) && !isBlocked(name) && requestWith(name) !== 'incoming'
    const suggestions = [
        ...Object.keys(accounts).filter((name) => name !== session.username && suggestable(name)).map((name) => profileOf(name)),
        ...DEMO_PLAYERS.filter((p) => suggestable(p.username)).map((p) => profileOf(p.username)),
    ].slice(0, 6)

    const activity = friends
        .flatMap((f) => {
            const player = getPlayer(f.username)
            if (!player) return []
            return playerLibrary(player, now).slice(0, 3).map((entry) => ({ ...entry, friend: profileOf(f.username) }))
        })
        .sort((a, b) => b.lastPlayed - a.lastPlayed)
        .slice(0, 8)

    return (
        <>
            {header}
            <div className={styles.layout}>
                <div className={styles.main}>
                    <Requests />
                    {friends.length === 0 ? (
                        <div className={styles.empty}>
                            <h2>No friends yet</h2>
                            <p>Add players by username, or pick someone from the suggestions.</p>
                        </div>
                    ) : (
                        grouped.map((group) => (
                            <section key={group.id} aria-labelledby={`group-${group.id}`} className={styles.group}>
                                <h2 id={`group-${group.id}`} className={styles.groupTitle}>{group.label} · {group.people.length}</h2>
                                <ul className={styles.list}>
                                    {group.people.map((person) => (
                                        <li key={person.username}>
                                            <Link href={`/u/${person.username}`} className={styles.person}>
                                                <span className={styles.avatar}>
                                                    <Avatar user={person} size={44} />
                                                    <PresenceDot status={person.status} className={styles.dot} />
                                                </span>
                                                <span className={styles.text}>
                                                    <span className={styles.name}>{person.displayName}</span>
                                                    <span className={`${styles.status} ${person.status.state === 'playing' ? styles.playing : ''}`}>{presenceLabel(person.status)}</span>
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))
                    )}

                    {activity.length > 0 && (
                        <section aria-labelledby="activity-title" className={`${styles.group} ${styles.activitySection}`}>
                            <h2 id="activity-title" className={styles.groupTitle}>Recent activity</h2>
                            <ul className={styles.activity}>
                                {activity.map((item) => {
                                    const game = getGame(item.slug)
                                    return (
                                        <li key={`${item.friend.username}-${item.slug}`}>
                                            <Avatar user={item.friend} size={32} />
                                            <p>
                                                <Link href={`/u/${item.friend.username}`} className={styles.strong}>{item.friend.displayName}</Link> played{' '}
                                                <Link href={`/games/${game.slug}`} className={styles.strong}>{game.title}</Link>
                                                <span className={styles.muted}> · {formatRelative(item.lastPlayed)} · {formatPlaytime(item.playtimeMinutes)}</span>
                                            </p>
                                            <Link href={`/games/${game.slug}`} className={styles.thumb} tabIndex={-1} aria-hidden="true">
                                                <Image src={cardImage(game)} alt="" fill sizes="36px" />
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </section>
                    )}
                </div>

                <aside className={styles.side}>
                    <AddFriend />
                    {suggestions.length > 0 && (
                        <section aria-labelledby="suggestions-title" className={styles.suggestions}>
                            <h2 id="suggestions-title" className={styles.groupTitle}>Players you may know</h2>
                            <ul>
                                {suggestions.map((person) => (
                                    <li key={person.username}>
                                        <Link href={`/u/${person.username}`} className={styles.suggestion}>
                                            <Avatar user={person} size={32} />
                                            <span className={styles.name}>{person.displayName}</span>
                                        </Link>
                                        {requestWith(person.username) === 'outgoing' ? (
                                            <span className={styles.pending}>Requested</span>
                                        ) : (
                                            <Button variant="ghost" size="small" onClick={() => sendFriendRequest(person.username)} aria-label={`Send ${person.displayName} a friend request`}>
                                                Add
                                            </Button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </aside>
            </div>
        </>
    )
}
