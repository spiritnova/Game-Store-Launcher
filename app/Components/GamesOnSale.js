'use client'

//styles
import styles from '../Components/GamesOnSale.module.css'


import games from '../api/gamesale.json'
import Slider from './UI/Slider'

export default function GamesOnSale(){
    return(
        <div className={styles.container}>
            <div className={styles.carousel}>
                <div className={styles.header}>
                    <div className={styles.title}>Game On Sale</div>
                </div>
            </div>
            <Slider slides={games}/>
        </div>
    )
}