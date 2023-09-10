import Image from 'next/image'
import styles from './FeaturedGames.module.css'

export default function FeaturedGames(){
    return(
        <div className={styles.container}>
            <div className={styles.title}>Featured PC Games</div>

            <div className={styles.cards}>
                <div className={styles.card}>
                    <div className={styles.image}>
                        <img 
                            src={'https://media.contentapi.ea.com/content/dam/gin/images/2021/06/battlefield-2042-key-art.jpg.adapt.crop1x1.767w.jpg'}
                        />
                        <div className={styles.cover}>
                            <img src='https://media.contentapi.ea.com/content/dam/battlefield/battlefield-2042/common/season-01/bf-2042-white-nav-logo.svg'/>
                            <p>Battlefield 2042</p>
                        </div>
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.image}>
                        <img 
                            src={'https://media.contentapi.ea.com/content/dam/gin/images/2022/05/1-1-gamebox-f122-keyart-1.png.adapt.crop1x1.767w.png'}
                        />
                        <div className={styles.cover}>
                            <img src='https://media.contentapi.ea.com/content/dam/gin/common/logos/f122-gamebox-logo.png'/>
                            <p>F1® 22</p>
                        </div>
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.image}>
                        <img 
                            src={'https://media.contentapi.ea.com/content/dam/gin/images/2022/07/eas-fifa22-gen5-ue-keyart-horz-f23logo.jpg.adapt.crop1x1.767w.jpg'}
                        />
                        <div className={styles.cover}>
                            <img src='https://media.contentapi.ea.com/content/dam/gin/common/logos/fifa23-logo-white-stacked.svg'/>
                            <p>FIFA 23</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}