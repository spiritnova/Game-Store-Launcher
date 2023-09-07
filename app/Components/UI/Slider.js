// Import Swiper React components
import { Swiper, SwiperSlide} from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

// stylesheet
import styles from './Slider.module.css'

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function Slider ({ slides }){
  return (
    <Swiper
      modules={[Navigation, Pagination]}
      navigation
      spaceBetween={30}
      slidesPerView={'auto'}
      pagination={{ clickable: true }}
      onSwiper={(swiper) => console.log(swiper)}
    >
      {slides.map(slide => (
        <SwiperSlide key={slide.image}>
          <div className={styles.card}>
              <img src={slide.image}/>
              <p>{slide.title}</p>
              <div className={styles.prices}>
                  <p>{slide.sale}</p>
                  <p>${slide.prev_price}</p>
                  <p>${slide.price}</p>
              </div>
              <div className={styles.wish}>
                <button className={styles.icon}>
                  <ion-icon name="add-outline"></ion-icon>
                  <span className={styles.tooltip}>Add to wishlist</span>
                </button>
              </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};