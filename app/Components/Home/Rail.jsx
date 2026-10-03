'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import GameCard from '../UI/GameCard'
import SectionHeader from '../UI/SectionHeader'
import styles from './Rail.module.css'

export default function Rail({ id, title, subtitle, href, games }) {
    const track = useRef(null)
    const [edges, setEdges] = useState({ start: true, end: false })

    const sync = useCallback(() => {
        const el = track.current
        if (!el) return
        setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
    }, [])

    useEffect(() => {
        sync()
        window.addEventListener('resize', sync)
        return () => window.removeEventListener('resize', sync)
    }, [sync])

    const scroll = (direction) => {
        const el = track.current
        el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' })
    }

    return (
        <section className={`container ${styles.section}`} aria-labelledby={id}>
            <SectionHeader id={id} title={title} subtitle={subtitle} href={href}>
                <div className={styles.buttons}>
                    <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label={`Scroll ${title} back`}>
                        <ChevronLeftIcon />
                    </button>
                    <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label={`Scroll ${title} forward`}>
                        <ChevronRightIcon />
                    </button>
                </div>
            </SectionHeader>

            <ul ref={track} className={styles.track} onScroll={sync}>
                {games.map((game) => (
                    <li key={game.slug} className={styles.item}>
                        <GameCard game={game} sizes="(max-width: 600px) 160px, 200px" />
                    </li>
                ))}
            </ul>
        </section>
    )
}
