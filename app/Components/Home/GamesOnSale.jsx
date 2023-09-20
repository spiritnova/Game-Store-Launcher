'use client'

//styles
import styles from './GamesOnSale.module.css'


import games from '../../api/gamesale.json'

// Import Swiper React components
import { Swiper, SwiperSlide, useSwiper} from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function GamesOnSale(){

    const [swiper, setSwiper] = useState(null)
    const [isBeginning, setIsBeginning] = useState(true)
    const [isEnd, setIsEnd] = useState(false)

    
    // Filtering elements that has sale property
    const slides = []
    
    games.forEach(element => {
        if(element.sale){
            slides.push(element)
        }
    });

    // Greying out the chevron buttons at the start and end
    useEffect(() => {
        if(swiper){
            swiper.on("slideChange", (s) => {
                setIsBeginning(s.isBeginning)
                setIsEnd(s.isEnd)
            })
        }
    }, [swiper])

    return(
        <div className={styles.container}>
            <div className={styles.carousel}>
                <div className={styles.header}>
                    <div className={styles.title}>Game On Sale</div>
                    <div className={styles.buttons}>
                        <button onClick={() => swiper.slidePrev()} className={isBeginning ? styles.isBeginning : ''}><ion-icon name="chevron-back-outline"></ion-icon></button>
                        <button onClick={() => swiper.slideNext()} className={isEnd ? styles.isBeginning : ''}><ion-icon name="chevron-forward-outline"></ion-icon></button>
                    </div>
                </div>
            
                <Swiper
                    modules={[Navigation, Pagination]}
                    spaceBetween={30}
                    slidesPerView={'1'}
                    grabCursor = {true}
                    onSwiper={(s) => setSwiper(s)}
                    breakpoints = {{
                        500:{
                            slidesPerView: 2,
                        },

                        630:{
                            slidesPerView: 2,
                        },

                        900: {
                            slidesPerView: 3,
                        },

                        1200:{
                            slidesPerView: 4,
                        },

                        1400:{
                            slidesPerView: 5,
                        },

                        1680:{
                            slidesPerView: 6,
                        }
                    }}
                >
                {slides.map(slide => (
                        <SwiperSlide key={slide.id} className={styles.swiper}>
                            <Link href={`/games/${slide.id}`}>
                                <div className={styles.card}>
                                    <div className={styles.image}>
                                        <img src={slide.image}/>

                                        <div className={styles.wish}>
                                            <button className={styles.icon}>
                                                <ion-icon name="add-outline"></ion-icon>
                                                <span className={styles.tooltip}>Add to wishlist</span>
                                            </button>
                                        </div>
                                    </div>
                                    <p>{slide.title}</p>
                                    <div className={styles.prices}>
                                        <p>{slide.sale}</p>
                                        <p>${slide.prev_price}</p>
                                        <p>${slide.price}</p>
                                    </div>
                                </div>
                            </Link>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </div>
    )
}