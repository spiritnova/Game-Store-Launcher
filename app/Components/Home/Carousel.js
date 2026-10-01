"use client"

import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

import Image from 'next/image';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { isSvg, spotlightGames } from '@/lib/games';
import GameActions from '../Game/GameActions';
import Price from '../UI/Price';
import styles from './Carousel.module.css'

// `blurs` maps each hero image to its blurred placeholder (computed on the server).
export default function MainCarousel({ blurs = {} }) {
    const [swiper, setSwiper] = useState(null)
    const [paused, setPaused] = useState(false)

    function handleSwiper(instance) {
        setSwiper(instance)
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            instance.autoplay.stop()
            setPaused(true)
        }
    }

    function togglePlayback() {
        if (!swiper) return
        if (paused) swiper.autoplay.start()
        else swiper.autoplay.stop()
        setPaused(!paused)
    }

    return (
        <section className={styles.hero} aria-roledescription="carousel" aria-label="Spotlight games">
          <Swiper
            modules={[Autoplay, Pagination, Navigation, A11y]}
            onSwiper={handleSwiper}
            loop
            autoplay={{ delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true }}
            pagination={{ clickable: true }}
            navigation
            className={styles.swiper}
          >
            {spotlightGames.map((game, index) => (
                <SwiperSlide key={game.slug}>
                    <div className={styles.slide}>
                        <Image
                            src={game.hero}
                            alt=""
                            fill
                            priority={index === 0}
                            sizes="(max-width: 900px) 100vw, calc(100vw - 248px)"
                            placeholder={blurs[game.hero] ? 'blur' : 'empty'}
                            blurDataURL={blurs[game.hero]}
                            className={styles.image}
                        />

                        <div className={styles.cover}>
                            <div className={styles.content}>
                                <div className={styles.logo}>
                                    <Image src={game.logo} alt={game.title} fill sizes="420px" unoptimized={isSvg(game.logo)} />
                                </div>
                                <h2>{game.spotlight.tagline}</h2>
                                <p>{game.spotlight.blurb}</p>
                                <Price game={game} size="large" />
                                <GameActions game={game} detailsHref={`/games/${game.slug}`} />
                            </div>
                        </div>
                    </div>
                </SwiperSlide>
            ))}
          </Swiper>

          <button
            type="button"
            className={styles.playback}
            onClick={togglePlayback}
            aria-label={paused ? 'Resume slideshow' : 'Pause slideshow'}
          >
            {paused ? <PlayArrowIcon /> : <PauseIcon />}
          </button>
        </section>
      );
}
