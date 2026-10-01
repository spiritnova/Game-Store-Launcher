import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  allGames,
  cardImage,
  formatReleaseDate,
  getGame,
  getRelatedGames,
  isSvg,
  releaseYear,
} from '@/lib/games'
import GameActions from '@/app/Components/Game/GameActions'
import GameCard from '@/app/Components/UI/GameCard'
import Price from '@/app/Components/UI/Price'
import styles from './page.module.css'

export const dynamicParams = false

export function generateStaticParams() {
  return allGames.map((game) => ({ slug: game.slug }))
}

export function generateMetadata({ params }) {
  const game = getGame(params.slug)
  if (!game) return {}

  return {
    title: game.title,
    description: game.description,
    openGraph: {
      title: game.title,
      description: game.description,
      images: [game.hero ?? game.cover],
    },
  }
}

export default function GamePage({ params }) {
  const game = getGame(params.slug)
  if (!game) notFound()

  const related = getRelatedGames(game)
  // Games with only portrait cover art get a blurred backdrop instead of a sharp banner.
  const backdrop = game.hero ?? game.cover

  return (
    <main>
      <section className={styles.banner}>
        <Image
          src={backdrop}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`${styles.backdrop} ${game.hero ? '' : styles.blurred}`}
        />
        <div className={`container ${styles.bannerInner}`}>
          <div className={styles.coverArt}>
            <Image src={cardImage(game)} alt={`${game.title} cover art`} fill priority sizes="260px" />
          </div>

          <div className={styles.heading}>
            <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
              <Link href="/games">Browse</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{game.title}</span>
            </nav>
            {game.logo && (
              <div className={styles.logo}>
                <Image src={game.logo} alt="" fill sizes="320px" unoptimized={isSvg(game.logo)} />
              </div>
            )}
            <h1 className={game.logo ? 'visually-hidden' : undefined}>{game.title}</h1>
            <p className={styles.meta}>
              {game.developer} · {releaseYear(game)}
            </p>
            <ul className={styles.genres} aria-label="Genres">
              {game.genres.map((genre) => (
                <li key={genre}>
                  <Link href={`/games?genre=${encodeURIComponent(genre)}`}>{genre}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className={`container ${styles.body}`}>
        <section className={styles.about} aria-labelledby="about-title">
          <h2 id="about-title">About this game</h2>
          <p>{game.description}</p>
        </section>

        <aside className={styles.purchase} aria-label="Purchase">
          <Price game={game} size="large" />
          <GameActions game={game} stacked />

          <dl className={styles.details}>
            <div>
              <dt>Developer</dt>
              <dd>{game.developer}</dd>
            </div>
            <div>
              <dt>Publisher</dt>
              <dd>{game.publisher}</dd>
            </div>
            <div>
              <dt>Release date</dt>
              <dd>{formatReleaseDate(game)}</dd>
            </div>
            <div>
              <dt>Platform</dt>
              <dd>Windows</dd>
            </div>
          </dl>
        </aside>
      </div>

      {related.length > 0 && (
        <section className={`container ${styles.related}`} aria-labelledby="related-title">
          <h2 id="related-title">More like this</h2>
          <div className={styles.relatedGrid}>
            {related.map((other) => (
              <GameCard key={other.slug} game={other} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
