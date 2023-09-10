import Carousel from './Components/Home/Carousel'
import GamesOnSale from './Components/Home/GamesOnSale'
import styles from './page.module.css'
import Script from 'next/script'

export default function Home() {
  return (
    <main className={styles.main}>
      <Carousel/>
      <GamesOnSale/>

      <Script src='https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js'/>
      <Script src='https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js'/>
    </main>
  )
}
