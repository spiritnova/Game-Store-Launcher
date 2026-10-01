import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import details from '@/data/game-details.json'
import { getSeedComments, getSeedReviews } from '@/lib/community'
import {
  allGames,
  bundlesForGame,
  cardImage,
  formatReleaseDate,
  formatSize,
  getGame,
  getMoreFromStudio,
  getRelatedGames,
  isSvg,
  releaseYear,
} from '@/lib/games'
import { blurProps } from '@/lib/images'
import Bundles from '@/app/Components/Game/Bundles'
import Comments from '@/app/Components/Game/Comments'
import Editions from '@/app/Components/Game/Editions'
import GameActions from '@/app/Components/Game/GameActions'
import { Features, SystemRequirements } from '@/app/Components/Game/GameInfo'
import Languages from '@/app/Components/Game/Languages'
import MediaGallery from '@/app/Components/Game/MediaGallery'
import Reviews from '@/app/Components/Game/Reviews'
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
      images: [game.banner ?? game.hero ?? game.cover],
    },
  }
}

export default function GamePage({ params }) {
  const game = getGame(params.slug)
  if (!game) notFound()

  const info = details[game.slug]
  const bundles = bundlesForGame(game.slug)
  const studio = getMoreFromStudio(game)
  const related = getRelatedGames(game, 4, studio.games.map((g) => g.slug))
  const multiplayer = info.features.some((f) => f.includes('multiplayer') || f.includes('co-op'))
  const shots = info.screenshots.map((src) => ({ src, blurDataURL: blurProps(src).blurDataURL }))

  return (
    <main>
      <section className={styles.banner}>
        <Image
          src={game.banner}
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 100vw, calc(100vw - 248px)"
          className={styles.backdrop}
          {...blurProps(game.banner)}
        />
        <div className={`container ${styles.bannerInner}`}>
          <div className={styles.coverArt}>
            <Image src={cardImage(game)} alt={`${game.title} cover art`} fill priority sizes="220px" {...blurProps(cardImage(game))} />
          </div>

          <div className={styles.heading}>
            <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
              <Link href="/games">Browse</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{game.title}</span>
            </nav>
            <div className={styles.logo}>
              <Image src={game.logo} alt="" fill sizes="320px" unoptimized={isSvg(game.logo)} />
            </div>
            <h1 className="visually-hidden">{game.title}</h1>
            <p className={styles.meta}>
              {game.developer} · {releaseYear(game)}
              {info.metacritic && (
                <span className={styles.metacritic} title="Metacritic score">
                  <strong>{info.metacritic}</strong> Metacritic
                </span>
              )}
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
        <div className={styles.main}>
          <MediaGallery title={game.title} shots={shots} />

          <section className={styles.about} aria-labelledby="about-title">
            <h2 id="about-title">About this game</h2>
            <p>{game.description}</p>
          </section>

          <Features features={info.features} />
          {game.editions.length > 1 && <Editions game={game} />}
          {bundles.length > 0 && <Bundles bundles={bundles} />}
          <SystemRequirements requirements={info.requirements} />
          <Languages languages={info.languages} />
          <Reviews game={game} seeded={getSeedReviews(game)} />
          <Comments game={game} seeded={getSeedComments(game, multiplayer)} />
        </div>

        <aside className={styles.purchase} aria-label="Purchase">
          <Price game={game} size="large" />
          <GameActions game={game} stacked />
          {game.editions.length > 1 && (
            <a href="#editions" className={styles.editionsLink}>
              {game.editions.length} editions available
            </a>
          )}

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
              <dt>Download size</dt>
              <dd>{formatSize(game.sizeGB)}</dd>
            </div>
            <div>
              <dt>Platform</dt>
              <dd>Windows</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>{info.languages.interface.length}</dd>
            </div>
          </dl>
          <a href="#reviews" className={styles.editionsLink}>Read player reviews</a>
        </aside>
      </div>

      {studio.games.length > 0 && (
        <section className={`container ${styles.related}`} aria-labelledby="studio-title">
          <h2 id="studio-title">More from {studio.label}</h2>
          <div className={styles.relatedGrid}>
            {studio.games.map((other) => (
              <GameCard key={other.slug} game={other} />
            ))}
          </div>
        </section>
      )}

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
