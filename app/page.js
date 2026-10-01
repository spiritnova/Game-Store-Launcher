import Carousel from './Components/Home/Carousel'
import FeaturedGames from './Components/Home/FeaturedGames'
import GamesOnSale from './Components/Home/GamesOnSale'
import Button from './Components/UI/Button'
import { allGames, spotlightGames } from '@/lib/games'
import { blurProps } from '@/lib/images'
import styles from './page.module.css'

export default function Home() {
  return (
    <main>
      <h1 className="visually-hidden">Discover games on Ultimate</h1>
      <Carousel blurs={Object.fromEntries(spotlightGames.map((g) => [g.hero, blurProps(g.hero).blurDataURL]))}/>
      <GamesOnSale/>
      <FeaturedGames/>

      <section className={`container ${styles.cta}`}>
        <h2>Looking for something else?</h2>
        <p>Search and filter all {allGames.length} games in the store by genre, price and discount.</p>
        <Button href="/games" size="large">Browse all games</Button>
      </section>
    </main>
  )
}
