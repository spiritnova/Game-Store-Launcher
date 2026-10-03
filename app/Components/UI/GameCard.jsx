import Image from 'next/image'
import Link from 'next/link'
import { cardImage, discountPercent, formatShortDate, isOnSale, isReleased, releaseTime } from '@/lib/games'
import { placeholderColor } from '@/lib/image-colors'
import Price from './Price'
import WishlistButton from './WishlistButton'
import styles from './GameCard.module.css'

export default function GameCard({ game, headingLevel = 3, sizes = '(max-width: 600px) 50vw, 220px' }) {
    const Heading = `h${headingLevel}`

    return (
        <article className={styles.card}>
            <Link href={`/games/${game.slug}`} className={styles.link}>
                <div className={styles.media} style={{ backgroundColor: placeholderColor(cardImage(game)) }}>
                    <Image src={cardImage(game)} alt="" fill sizes={sizes} className={styles.image} />
                    {isOnSale(game) && <span className={styles.discount}>-{discountPercent(game)}%</span>}
                    {game.releaseDate && !isReleased(game) && <span className={styles.upcoming}>Out {formatShortDate(releaseTime(game))}</span>}
                </div>
                <div className={styles.info}>
                    <Heading className={styles.title}>{game.title}</Heading>
                    <p className={styles.genre}>{game.genres.slice(0, 2).join(' · ')}</p>
                    <Price game={game} hideBadge />
                </div>
            </Link>
            <div className={styles.action}>
                <WishlistButton game={game} />
            </div>
        </article>
    )
}
