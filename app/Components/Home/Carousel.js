"use client"

// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

import styles from './Carousel.module.css'

// import required modules
import { Autoplay, Pagination, Navigation } from 'swiper/modules';

import Image from 'next/image';

// Images
import codmw2 from '../../Assets/images/callofdutymw2.jpg'
import dmc5 from '../../Assets/images/devilmaycry5.jpg'
import w3 from '../../Assets/images/witcher3.jpg'
import codlogo from '../../Assets/images/cod-mw2-logo.png'
import w3l from '../../Assets/images/tw3-new-logo.webp'
import dmc5logo from '../../Assets/images/logo_dmc5_main.png'
import Button from '../UI/Button';
import Link from 'next/link';

export default function MainCarousel() {
    return (
        <>
          <Swiper
            spaceBetween={30}
            centeredSlides={true}
            autoplay={{
              delay: 5500,
              disableOnInteraction: false,
            }}
            pagination={{
              clickable: true,
            }}
            navigation={true}
            modules={[Autoplay, Pagination, Navigation]}
            className="mySwiper"
          >
            <SwiperSlide>
                <div className={styles.slide}>
                    <Image
                        src={codmw2}
                        alt='Call of duty modern warfare 2 remastered'
                        id='slide-1'
                        className={styles.image}
                    />

                    <div className={styles.cover}>
                        <div className={styles.content}>
                            <Image src ={codlogo} alt='Cod mw2 logo'/>
                            <h3>THE ULTIMATE WEAPON IS TEAM.</h3>
                            <p>Squad up and fight alongside the iconic operators of Task Force 141 with the return of Modern Warfare®.</p>
                            <Link href={`/games/8`}><Button text={'PURCHASE'}/></Link>
                        </div>
                    </div>
                </div>
            </SwiperSlide>
            <SwiperSlide>
            <div className={styles.slide}> 
                <Image
                    src={dmc5}
                    alt='Devil May Cry 5'
                    id='slide-2'
                    className={styles.image}
                />
                <div className={styles.cover}>
                    <div className={styles.content}>
                        <Image src ={dmc5logo} alt='Cod mw2 logo'/>
                        <h3>Climb the Stylish Ranks!</h3>
                        <p>Legendary DMC action returns, made all the more stylish by the power modern gaming has to offer.</p>
                        <Link href={`/games/9`}><Button text={'PURCHASE'}/></Link>
                    </div>
                </div>
                </div>
            </SwiperSlide>
            <SwiperSlide>
                <div className={styles.slide}>
                    <Image
                        src={w3}
                        alt='Witcher 3 : Wild Hunt'
                        id='slide-3'
                        className={styles.image}
                    />

                    <div className={styles.cover} style={{top: '5rem'}}>
                        <div className={styles.content}>
                            <Image src ={w3l} alt='Witcher 3 : wild hunt logo'/>
                            <h3>THE MOST AWARDED GAME OF A GENERATION NOW ENHANCED FOR THE NEXT</h3>
                            <p>You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will. Your current contract? Tracking down Ciri — the Child of Prophecy, a living weapon that can alter the shape of the world.</p>
                            <Link href={`/games/10`}><Button text={'PURCHASE'}/></Link>
                        </div>
                    </div>
                </div>
            </SwiperSlide>
          </Swiper>
        </>
      );
}