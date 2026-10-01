import Image from 'next/image'
import Link from 'next/link'
import { cardImage } from '@/lib/games'
import Price from './Price'
import WishlistButton from './WishlistButton'
import styles from './GameCard.module.css'

export default function GameCard({ game, headingLevel = 3, sizes = '(max-width: 600px) 50vw, 220px' }) {
    const Heading = `h${headingLevel}`

    return (
        <article className={styles.card}>
            <Link href={`/games/${game.slug}`} className={styles.link}>
                <div className={styles.media}>
                    <Image src={cardImage(game)} alt="" fill sizes={sizes} className={styles.image} />
                </div>
                <Heading className={styles.title}>{game.title}</Heading>
                <Price game={game} />
            </Link>
            <div className={styles.action}>
                <WishlistButton game={game} />
            </div>
        </article>
    )
}
