'use client'

import Image from 'next/image'
import Link from 'next/link'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import { getGame } from '@/lib/games'
import { placeholderColor } from '@/lib/image-colors'
import { useDownloads } from '@/lib/downloads'
import { formatLastPlayed, formatPlaytime, useStore } from '@/lib/store'
import Button from '../UI/Button'
import SectionHeader from '../UI/SectionHeader'
import styles from './ContinuePlaying.module.css'

// "Continue playing": the player's recently played installed games.
export default function ContinuePlaying() {
    const { hydrated, session, library, play } = useStore()
    const downloads = useDownloads()

    if (!hydrated) return <div className={styles.placeholder} aria-hidden="true" />
    if (!session) return null

    const recent = library
        .filter((entry) => entry.installed)
        .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
        .slice(0, 4)
    if (recent.length === 0) return null

    return (
        <section className={`container ${styles.section}`} aria-labelledby="continue-title">
            <SectionHeader id="continue-title" title="Continue playing" subtitle="Jump back into your installed games" href="/library" hrefLabel="Your library" />
            <ul className={styles.grid}>
                {recent.map((entry) => {
                    const game = getGame(entry.slug)
                    const update = downloads.updateFor(entry.slug)
                    const lastPlayed = formatLastPlayed(entry.lastPlayed)
                    return (
                        <li key={entry.slug} className={styles.card}>
                            <Link href={`/games/${game.slug}`} className={styles.media} style={{ backgroundColor: placeholderColor(game.banner) }} aria-label={game.title}>
                                <Image src={game.banner} alt="" fill sizes="(max-width: 700px) 100vw, 25vw" />
                                {update && <span className={styles.update}><SystemUpdateAltIcon fontSize="inherit" /> Update available</span>}
                            </Link>
                            <div className={styles.body}>
                                <div>
                                    <h3>{game.title}</h3>
                                    <p>{lastPlayed ?? 'Not played yet'} · {formatPlaytime(entry.playtimeMinutes)}</p>
                                </div>
                                <Button variant="success" size="small" onClick={() => play(game)} aria-label={`Play ${game.title}`}>
                                    <PlayArrowIcon fontSize="small" /> Play
                                </Button>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
