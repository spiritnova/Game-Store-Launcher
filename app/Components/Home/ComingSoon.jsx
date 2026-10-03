import Image from 'next/image'
import Link from 'next/link'
import { cardImage, isSvg } from '@/lib/games'
import { blurProps } from '@/lib/images'
import GameActions from '../Game/GameActions'
import Price from '../UI/Price'
import SectionHeader from '../UI/SectionHeader'
import ReleaseCountdown from './ReleaseCountdown'
import styles from './ComingSoon.module.css'

const LIST = 6
// Release dates are whole days in UTC, so they're formatted in UTC too
const formatDate = (game, options) => new Date(game.releaseDate).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' })

// A release calendar instead of a slider: the next game out, large, beside a dated list of the ones after it.
// `backdrop` is a screenshot of the next game (store hero art is often too dark to sit behind text).
export default function ComingSoon({ games, backdrop }) {
    const [next, ...later] = games

    return (
        <section className={`container ${styles.section}`} aria-labelledby="soon-title">
            <SectionHeader
                id="soon-title"
                title="Coming soon"
                subtitle="Pre-order now, pre-load early and play on release day"
                href="/games?upcoming=1"
                hrefLabel={`All ${games.length} upcoming`}
            />

            <div className={`${styles.layout} ${later.length === 0 ? styles.single : ''}`}>
                <article className={`theme-dark ${styles.spotlight}`}>
                    <Image src={backdrop ?? next.banner} alt="" fill sizes="(max-width: 900px) 100vw, 55vw" className={styles.backdrop} {...blurProps(backdrop ?? next.banner)} />
                    <div className={styles.content}>
                        <p className={styles.eyebrow}>
                            Next release · <ReleaseCountdown game={next} className={styles.countdown} />
                        </p>
                        {next.logo ? (
                            <div className={styles.logo}>
                                <Image src={next.logo} alt={next.title} fill sizes="320px" unoptimized={isSvg(next.logo)} />
                            </div>
                        ) : (
                            <h3 className={styles.title}>{next.title}</h3>
                        )}
                        <p className={styles.date}>{formatDate(next, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <p className={styles.description}>{next.description}</p>
                        <div className={styles.buy}>
                            <Price game={next} size="large" />
                            <GameActions game={next} detailsHref={`/games/${next.slug}`} />
                        </div>
                    </div>
                </article>

                {later.length > 0 && (
                    <ol className={styles.timeline}>
                        {later.slice(0, LIST).map((game) => (
                            <li key={game.slug}>
                                <Link href={`/games/${game.slug}`} className={styles.row}>
                                    <time dateTime={game.releaseDate} className={styles.day}>
                                        <span>{formatDate(game, { month: 'short' })}</span>
                                        <strong>{formatDate(game, { day: 'numeric' })}</strong>
                                    </time>
                                    <span className={styles.thumb}>
                                        <Image src={cardImage(game)} alt="" fill sizes="48px" {...blurProps(cardImage(game))} />
                                    </span>
                                    <span className={styles.text}>
                                        <span className={styles.name}>{game.title}</span>
                                        <span className={styles.meta}>{game.developer} · {game.genres.slice(0, 2).join(' · ')}</span>
                                    </span>
                                    {/* Only the prices: the whole game would be sent to the browser */}
                                    <Price game={{ price: game.price, salePrice: game.salePrice }} />
                                </Link>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </section>
    )
}
