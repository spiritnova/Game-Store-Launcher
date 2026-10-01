'use client'

import Image from 'next/image'
import Link from 'next/link'
import { cardImage, currentPrice, formatPrice, getGame, isOnSale } from '@/lib/games'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import Price from '../UI/Price'
import Skeleton from '../UI/Skeleton'
import styles from './WishlistView.module.css'

export default function WishlistView() {
  const { hydrated, wishlist, buy, toggleWishlist } = useStore()

  const games = [...wishlist]
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((entry) => getGame(entry.slug))
  const onSaleCount = games.filter(isOnSale).length
  const total = games.reduce((sum, game) => sum + currentPrice(game), 0)

  return (
    <>
      <header className={styles.header}>
        <h1>Wishlist</h1>
        {hydrated && games.length > 0 && (
          <p>
            {games.length} {games.length === 1 ? 'game' : 'games'}
            {onSaleCount > 0 && <> · <span className={styles.sale}>{onSaleCount} on sale</span></>}
            {' '}· {formatPrice(total)} total
          </p>
        )}
      </header>

      {!hydrated ? (
        <div className={styles.list} aria-busy="true" aria-label="Loading">
          {[0, 1].map((i) => <Skeleton key={i} height="132px" radius="8px" />)}
        </div>
      ) : games.length === 0 ? (
        <div className={styles.empty}>
          <h2>Your wishlist is empty</h2>
          <p>Use the + button on any game to save it for later. Discounts show up here as soon as a game goes on sale.</p>
          <div className={styles.emptyActions}>
            <Button href="/games">Browse games</Button>
            <Button href="/games?sale=1" variant="ghost">See current deals</Button>
          </div>
        </div>
      ) : (
        <ul className={styles.list}>
          {games.map((game) => (
            <li key={game.slug} className={styles.row}>
              <Link href={`/games/${game.slug}`} className={styles.media} tabIndex={-1} aria-hidden="true">
                <Image src={cardImage(game)} alt="" fill sizes="96px" />
              </Link>
              <div className={styles.info}>
                <h2>
                  <Link href={`/games/${game.slug}`}>{game.title}</Link>
                </h2>
                <p>{game.genres.join(' · ')}</p>
              </div>
              <div className={styles.price}>
                <Price game={game} />
              </div>
              <div className={styles.actions}>
                <Button size="small" onClick={() => buy(game)}>Buy now</Button>
                <Button size="small" variant="ghost" onClick={() => toggleWishlist(game)} aria-label={`Remove ${game.title} from wishlist`}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
