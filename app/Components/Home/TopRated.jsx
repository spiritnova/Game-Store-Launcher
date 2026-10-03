import Image from 'next/image'
import Link from 'next/link'
import { cardImage } from '@/lib/games'
import { blurProps } from '@/lib/images'
import Price from '../UI/Price'
import SectionHeader from '../UI/SectionHeader'
import styles from './TopRated.module.css'

// `games` are [{ game, score }], best first
export default function TopRated({ games }) {
    return (
        <section className={`container ${styles.section}`} aria-labelledby="rated-title">
            <SectionHeader id="rated-title" title="Top rated" subtitle="Critically acclaimed, ranked by Metacritic score" href="/games" />
            <ol className={styles.chart}>
                {games.map(({ game, score }, i) => (
                    <li key={game.slug}>
                        <Link href={`/games/${game.slug}`} className={`${styles.row} ${i < 3 ? styles.podium : ''}`}>
                            <span className={styles.rank} aria-hidden="true">{i + 1}</span>
                            <span className={styles.thumb}>
                                <Image src={cardImage(game)} alt="" fill sizes="54px" {...blurProps(cardImage(game))} />
                            </span>
                            <span className={styles.text}>
                                <span className={styles.name}>{game.title}</span>
                                <span className={styles.meta}>{game.genres.slice(0, 2).join(' · ')}</span>
                                <Price game={game} />
                            </span>
                            <span className={styles.score} title="Metacritic score">
                                {score}
                                <span className="visually-hidden"> on Metacritic</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ol>
        </section>
    )
}
