'use client'

import { useState } from 'react'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { getAchievements, rarity, unlockedAchievements } from '@/lib/achievements'
import { useStore } from '@/lib/store'
import styles from './Achievements.module.css'

const PAGE = 8

// The game's achievements with how many players have unlocked each one, plus your own progress if you own it.
export default function Achievements({ game }) {
    const { hydrated, getEntry } = useStore()
    const [showAll, setShowAll] = useState(false)
    const all = getAchievements(game)
    if (all.length === 0) return null

    const entry = hydrated ? getEntry(game.slug) : null
    const unlocked = new Map((entry ? unlockedAchievements(entry) : []).map((a) => [a.id, a.unlockedAt]))
    const percent = Math.round((unlocked.size / all.length) * 100)
    // Your unlocked achievements first (newest first), then the rest from most to least common
    const sorted = [...all].sort((a, b) => (unlocked.get(b.id) ?? 0) - (unlocked.get(a.id) ?? 0) || b.percent - a.percent)
    const shown = showAll ? sorted : sorted.slice(0, PAGE)

    return (
        <section id="achievements" className={styles.section} aria-labelledby="achievements-title">
            <div className={styles.header}>
                <h2 id="achievements-title">Achievements <span className={styles.count}>{all.length}</span></h2>
                {entry && (
                    <div className={styles.progress}>
                        <p>You’ve unlocked <strong>{unlocked.size}</strong> of {all.length} ({percent}%)</p>
                        <div className={styles.bar} aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
                    </div>
                )}
            </div>

            <ul className={styles.grid}>
                {shown.map((a) => {
                    const at = unlocked.get(a.id)
                    const rare = rarity(a.percent)
                    return (
                        <li key={a.id} className={`${styles.item} ${at ? styles.unlocked : ''}`}>
                            <span className={styles.icon} aria-hidden="true">
                                {at || !entry ? <EmojiEventsIcon fontSize="small" /> : <LockOutlinedIcon fontSize="small" />}
                            </span>
                            <div className={styles.text}>
                                <p className={styles.name}>
                                    {a.name}
                                    {rare && <span className={styles.rare}>{rare}</span>}
                                </p>
                                <p className={styles.description}>{a.description}</p>
                                <p className={styles.meta}>
                                    {a.percent}% of players
                                    {at && <> · Unlocked {new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>}
                                    {entry && !at && <span className="visually-hidden"> · Locked</span>}
                                </p>
                            </div>
                        </li>
                    )
                })}
            </ul>

            {all.length > PAGE && (
                <button type="button" className={styles.more} onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
                    {showAll ? 'Show fewer' : `Show all ${all.length} achievements`}
                </button>
            )}
            <p className={styles.note}>Achievements and unlock rates are sample content, unlocked by playtime in this demo.</p>
        </section>
    )
}
