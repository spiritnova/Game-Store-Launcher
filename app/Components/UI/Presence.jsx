'use client'

import { getGame } from '@/lib/games'
import { presence } from '@/lib/players'
import { formatRelative, useStore } from '@/lib/store'
import styles from './Presence.module.css'

// Online status for a friend: demo players come and go on their own; local accounts follow the status
// they picked while signed in, and otherwise show when they were last seen.
export function usePresence() {
    const { session, accounts, playing } = useStore()
    return (username, now) => {
        if (username === session?.username) {
            const status = accounts[username].profile.status
            if (status === 'invisible') return { state: 'offline', invisible: true }
            if (playing) return { state: 'playing', slug: playing.slug }
            return { state: status === 'away' ? 'away' : 'online' }
        }
        const local = accounts[username]
        if (local) return { state: 'offline', lastOnline: local.profile.lastSeen }
        return presence(username, now)
    }
}

export function presenceLabel(status) {
    if (status.state === 'playing') return `Playing ${getGame(status.slug)?.title ?? 'a game'}`
    if (status.state === 'online') return 'Online'
    if (status.state === 'away') return 'Away'
    if (status.invisible) return 'Invisible · you appear offline'
    return status.lastOnline ? `Last online ${formatRelative(status.lastOnline)}` : 'Offline'
}

export function PresenceDot({ status, className }) {
    return <span className={`${styles.dot} ${styles[status.state]} ${className ?? ''}`} aria-hidden="true" />
}
