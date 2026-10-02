'use client'

import Link from 'next/link'
import { getPlayer } from '@/lib/players'
import { formatPlaytime, useStore } from '@/lib/store'
import Avatar from '../UI/Avatar'
import styles from './FriendsWhoOwn.module.css'

// "3 friends own this game" with their playtime, for the game page's purchase panel.
export default function FriendsWhoOwn({ game }) {
    const { hydrated, friends, accounts, profileOf } = useStore()
    if (!hydrated || friends.length === 0) return null

    const owners = friends
        .map((f) => {
            const entry = accounts[f.username]?.library.find((e) => e.slug === game.slug)
                ?? getPlayer(f.username)?.library.find((e) => e.slug === game.slug)
            return entry ? { ...profileOf(f.username), minutes: entry.playtimeMinutes } : null
        })
        .filter(Boolean)
        .sort((a, b) => b.minutes - a.minutes)
    if (owners.length === 0) return null

    return (
        <section className={styles.friends} aria-labelledby="friends-own-title">
            <h2 id="friends-own-title">{owners.length === 1 ? '1 friend owns this' : `${owners.length} friends own this`}</h2>
            <ul>
                {owners.slice(0, 4).map((friend) => (
                    <li key={friend.username}>
                        <Link href={`/u/${friend.username}`}>
                            <Avatar user={friend} size={28} />
                            <span className={styles.name}>{friend.displayName}</span>
                            <span className={styles.time}>{formatPlaytime(friend.minutes)}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}
