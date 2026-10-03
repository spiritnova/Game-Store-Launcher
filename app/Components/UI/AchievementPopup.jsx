'use client'

import { useState } from 'react'
import Link from 'next/link'
import CloseIcon from '@mui/icons-material/Close'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { rarity } from '@/lib/achievements'
import { getGame } from '@/lib/games'
import { useStore } from '@/lib/store'
import styles from './AchievementPopup.module.css'

const SHOW_MS = 5000

// Steam-style "Achievement unlocked" card, one at a time from the store's queue. A bar drains while it
// shows and dismisses it when empty; hovering or focusing the card pauses it.
export default function AchievementPopup() {
    const { unlocks, dismissUnlock } = useStore()
    const [paused, setPaused] = useState(false)
    const current = unlocks[0]

    if (!current) return <div className={styles.region} role="status" aria-live="polite" />
    const { achievement, slug } = current
    const game = getGame(slug)
    const label = rarity(achievement.percent)

    return (
        <div className={styles.region} role="status" aria-live="polite">
            <div
                key={current.key}
                className={styles.card}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
            >
                <span className={styles.trophy} aria-hidden="true">
                    <EmojiEventsIcon />
                </span>
                <div className={styles.text}>
                    <p className={styles.eyebrow}>Achievement unlocked</p>
                    <Link href={`/games/${slug}#achievements`} className={styles.name} onClick={() => dismissUnlock(current.key)}>
                        {achievement.name}
                    </Link>
                    <p className={styles.meta}>
                        {game?.title} · {label ? `${label}, ` : ''}{achievement.percent}% of players
                    </p>
                </div>
                <button type="button" className={styles.close} onClick={() => dismissUnlock(current.key)} aria-label={`Dismiss ${achievement.name}`}>
                    <CloseIcon fontSize="small" />
                </button>
                {unlocks.length > 1 && <span className={styles.more}>+{unlocks.length - 1}</span>}
                <span
                    className={`${styles.timer} ${paused ? styles.timerPaused : ''}`}
                    style={{ animationDuration: `${SHOW_MS}ms` }}
                    onAnimationEnd={() => dismissUnlock(current.key)}
                    aria-hidden="true"
                />
            </div>
        </div>
    )
}
