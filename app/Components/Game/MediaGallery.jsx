'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import styles from './MediaGallery.module.css'

// `shots` come from the server with their blur placeholders: [{ src, blurDataURL }]
export default function MediaGallery({ title, shots }) {
    const [index, setIndex] = useState(0)
    const [lightbox, setLightbox] = useState(false)
    const dialog = useRef(null)
    const thumbs = useRef([])
    const count = shots.length

    const go = (delta) => setIndex((i) => (i + delta + count) % count)

    useEffect(() => {
        const el = dialog.current
        if (!el) return
        if (lightbox && !el.open) el.showModal()
        if (!lightbox && el.open) el.close()
    }, [lightbox])

    // Keep the selected thumbnail in view, only when the selection changes (scrolling on mount would move the page)
    const shownIndex = useRef(index)
    useEffect(() => {
        if (shownIndex.current === index) return
        shownIndex.current = index
        thumbs.current[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }, [index])

    function onKeyDown(e) {
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
    }

    const current = shots[index]
    const label = `${title} screenshot ${index + 1} of ${count}`

    return (
        <section className={styles.gallery} aria-roledescription="carousel" aria-label={`${title} screenshots`} onKeyDown={onKeyDown}>
            <div className={styles.stage}>
                <button type="button" className={styles.open} onClick={() => setLightbox(true)} aria-label={`Open ${label} full screen`}>
                    <Image
                        key={current.src}
                        src={current.src}
                        alt={label}
                        fill
                        sizes="(max-width: 900px) 100vw, 60vw"
                        placeholder="blur"
                        blurDataURL={current.blurDataURL}
                        priority={index === 0}
                    />
                    <span className={styles.expand} aria-hidden="true"><FullscreenIcon /></span>
                </button>
                <button type="button" className={`${styles.arrow} ${styles.prev}`} onClick={() => go(-1)} aria-label="Previous screenshot">
                    <ChevronLeftIcon />
                </button>
                <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => go(1)} aria-label="Next screenshot">
                    <ChevronRightIcon />
                </button>
                <span className={styles.counter} aria-live="polite">{index + 1} / {count}</span>
            </div>

            <ul className={styles.thumbs}>
                {shots.map((shot, i) => (
                    <li key={shot.src}>
                        <button
                            ref={(el) => (thumbs.current[i] = el)}
                            type="button"
                            className={`${styles.thumb} ${i === index ? styles.selected : ''}`}
                            onClick={() => setIndex(i)}
                            aria-label={`Show screenshot ${i + 1}`}
                            aria-current={i === index ? 'true' : undefined}
                        >
                            <Image src={shot.src} alt="" fill sizes="160px" placeholder="blur" blurDataURL={shot.blurDataURL} />
                        </button>
                    </li>
                ))}
            </ul>

            <dialog ref={dialog} className={styles.lightbox} onClose={() => setLightbox(false)} aria-label={label}>
                {lightbox && (
                    <>
                        <div className={styles.lightboxImage}>
                            <Image src={current.src} alt={label} fill sizes="100vw" placeholder="blur" blurDataURL={current.blurDataURL} />
                        </div>
                        <button type="button" className={styles.close} onClick={() => setLightbox(false)} aria-label="Close full screen">
                            <CloseIcon />
                        </button>
                        <button type="button" className={`${styles.arrow} ${styles.prev}`} onClick={() => go(-1)} aria-label="Previous screenshot">
                            <ChevronLeftIcon />
                        </button>
                        <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => go(1)} aria-label="Next screenshot">
                            <ChevronRightIcon />
                        </button>
                        <span className={styles.counter}>{index + 1} / {count}</span>
                    </>
                )}
            </dialog>
        </section>
    )
}
