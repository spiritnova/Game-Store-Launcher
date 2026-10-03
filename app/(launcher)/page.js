import details from '@/data/game-details.json'
import { allGames, currentPrice, isReleased, spotlightGames, topDeals, upcomingGames } from '@/lib/games'
import { blurProps } from '@/lib/images'
import BundleShowcase from '../Components/Home/BundleShowcase'
import Carousel from '../Components/Home/Carousel'
import Categories from '../Components/Home/Categories'
import ContinuePlaying from '../Components/Home/ContinuePlaying'
import FeaturedGames from '../Components/Home/FeaturedGames'
import NewsStrip from '../Components/Home/NewsStrip'
import Rail from '../Components/Home/Rail'
import Button from '../Components/UI/Button'
import styles from './page.module.css'

// Rebuilt hourly so "New releases" and "Coming soon" follow the calendar
export const revalidate = 3600

const ROW = 16
const score = (game) => details[game.slug]?.metacritic ?? 0
const features = (game) => details[game.slug]?.features ?? []

// Rails only need what a card shows, which keeps the page payload small.
const card = (game) => ({
  slug: game.slug,
  title: game.title,
  genres: game.genres,
  price: game.price,
  salePrice: game.salePrice,
  releaseDate: game.releaseDate,
  cover: game.cover,
  hero: game.hero,
})
const rows = (games) => games.slice(0, ROW).map(card)

export default function Home() {
  // Pre-orders get their own row; the other rows only show games that are out
  const released = allGames.filter((g) => isReleased(g))
  const upcoming = upcomingGames()

  const deals = topDeals(ROW)
  const newest = [...released].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
  const topRated = released.filter((g) => score(g) > 0).sort((a, b) => score(b) - score(a))
  const withFriends = released
    .filter((g) => features(g).some((f) => f === 'Online co-op' || f === 'Local co-op & split screen'))
    .sort((a, b) => score(b) - score(a))
  const free = released.filter((g) => g.price === 0)
  const under10 = released.filter((g) => g.price > 0 && currentPrice(g) < 10).sort((a, b) => score(b) - score(a) || currentPrice(a) - currentPrice(b))
  const byGenre = (genre) => released.filter((g) => g.genres.includes(genre)).sort((a, b) => score(b) - score(a))

  return (
    <main>
      <h1 className="visually-hidden">Discover games on Ultimate Game Launcher</h1>
      <Carousel blurs={Object.fromEntries(spotlightGames.map((g) => [g.hero, blurProps(g.hero).blurDataURL]))}/>

      <ContinuePlaying/>

      <Rail id="deals-title" title="Top deals" subtitle="The biggest discounts in the store right now" href="/games?sale=1&sort=discount" games={rows(deals)} />
      <Rail id="new-title" title="New releases" subtitle="The latest games to hit the store" href="/games?sort=newest" games={rows(newest)} />
      {upcoming.length > 0 && (
        <Rail id="soon-title" title="Coming soon" subtitle="Pre-order now, pre-load early and play on release day" href="/games?upcoming=1" games={rows(upcoming)} />
      )}

      <FeaturedGames/>

      <Rail id="rated-title" title="Top rated" subtitle="Critically acclaimed, ranked by Metacritic score" href="/games" games={rows(topRated)} />

      <Categories/>

      <BundleShowcase/>

      <Rail id="coop-title" title="Play with friends" subtitle="Co-op and split-screen games for the whole squad" href="/games?genre=Multiplayer" games={rows(withFriends)} />
      <Rail id="free-title" title="Free to play" subtitle="Download and play for nothing" href="/games?genre=Free%20to%20Play" games={rows(free)} />
      <Rail id="cheap-title" title="Great games under $10" subtitle="Acclaimed picks that won't cost much" href="/games?sort=price-asc" games={rows(under10)} />
      <Rail id="horror-title" title="Survive the night" subtitle="Horror favourites" href="/games?genre=Horror" games={rows(byGenre('Horror'))} />
      <Rail id="indie-title" title="Indie gems" subtitle="Small teams, big ideas" href="/games?genre=Indie" games={rows(byGenre('Indie'))} />

      <NewsStrip/>

      <section className={`container ${styles.cta}`}>
        <h2>Looking for something else?</h2>
        <p>Search and filter all {allGames.length} games in the store by category, price and discount.</p>
        <Button href="/games" size="large">Browse all games</Button>
      </section>
    </main>
  )
}
