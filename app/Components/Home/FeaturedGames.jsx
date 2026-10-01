import Image from 'next/image'
import Link from 'next/link'
import { featuredGames, isSvg } from '@/lib/games'
import { blurProps } from '@/lib/images'
import Price from '../UI/Price'
import SectionHeader from '../UI/SectionHeader'
import styles from './FeaturedGames.module.css'

export default function FeaturedGames(){
    return(
        <section className={`container ${styles.section}`} aria-labelledby="featured-title">
            <SectionHeader id="featured-title" title="Featured PC games" subtitle="Hand-picked highlights from the EA catalogue" href="/games" />

            <ul className={styles.cards}>
                {featuredGames.map(game => (
                    <li key={game.slug}>
                        <Link href={`/games/${game.slug}`} className={styles.card}>
                            <div className={styles.image}>
                                <Image src={game.hero} alt="" fill sizes="(max-width: 900px) 100vw, 30vw" {...blurProps(game.hero)} />
                                <div className={styles.cover}>
                                    <div className={styles.logo}>
                                        <Image src={game.logo} alt="" fill sizes="200px" unoptimized={isSvg(game.logo)} />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.info}>
                                <div>
                                    <h3>{game.title}</h3>
                                    <p>{game.genres.slice(0, 2).join(' · ')}</p>
                                </div>
                                <Price game={game} />
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}
