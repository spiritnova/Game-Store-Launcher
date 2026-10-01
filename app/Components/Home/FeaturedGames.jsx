import Image from 'next/image'
import Link from 'next/link'
import { featuredGames, isSvg } from '@/lib/games'
import Price from '../UI/Price'
import styles from './FeaturedGames.module.css'

export default function FeaturedGames(){
    return(
        <section className={styles.section} aria-labelledby="featured-title">
            <div className="container">
                <h2 id="featured-title" className={styles.title}>Featured PC games</h2>

                <ul className={styles.cards}>
                    {featuredGames.map(game => (
                        <li key={game.slug}>
                            <Link href={`/games/${game.slug}`} className={styles.card}>
                                <div className={styles.image}>
                                    <Image src={game.hero} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" />
                                    <div className={styles.cover}>
                                        <div className={styles.logo}>
                                            <Image src={game.logo} alt="" fill sizes="200px" unoptimized={isSvg(game.logo)} />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.info}>
                                    <h3>{game.title}</h3>
                                    <Price game={game} />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}
