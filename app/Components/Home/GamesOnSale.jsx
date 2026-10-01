'use client'

import { useState } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y } from 'swiper/modules';
import 'swiper/css';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { gamesOnSale } from '@/lib/games';
import GameCard from '../UI/GameCard';
import styles from './GamesOnSale.module.css'

export default function GamesOnSale(){
    const [swiper, setSwiper] = useState(null)
    const [edges, setEdges] = useState({ isBeginning: true, isEnd: false })

    // Grey out the chevrons at either end; also re-check on resize since slidesPerView changes.
    const syncEdges = (s) => setEdges({ isBeginning: s.isBeginning, isEnd: s.isEnd })

    return(
        <section className={`container ${styles.container}`} aria-labelledby="sale-title">
            <div className={styles.header}>
                <h2 id="sale-title" className={styles.title}>Games on sale</h2>
                <Link href="/games?sale=1" className={styles.viewAll}>View all</Link>
                <div className={styles.buttons}>
                    <button
                        type="button"
                        onClick={() => swiper?.slidePrev()}
                        disabled={!swiper || edges.isBeginning}
                        aria-label="Previous games"
                    >
                        <ChevronLeftIcon />
                    </button>
                    <button
                        type="button"
                        onClick={() => swiper?.slideNext()}
                        disabled={!swiper || edges.isEnd}
                        aria-label="Next games"
                    >
                        <ChevronRightIcon />
                    </button>
                </div>
            </div>

            <Swiper
                modules={[A11y]}
                spaceBetween={16}
                slidesPerView={2}
                grabCursor
                onSwiper={(s) => { setSwiper(s); syncEdges(s) }}
                onSlideChange={syncEdges}
                onResize={syncEdges}
                breakpoints={{
                    640: { slidesPerView: 3, spaceBetween: 20 },
                    900: { slidesPerView: 4, spaceBetween: 24 },
                    1200: { slidesPerView: 5, spaceBetween: 24 },
                    1500: { slidesPerView: 6, spaceBetween: 24 },
                }}
            >
                {gamesOnSale.map(game => (
                    <SwiperSlide key={game.slug} className={styles.slide}>
                        <GameCard game={game} sizes="(max-width: 640px) 50vw, (max-width: 1200px) 25vw, 240px" />
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}
