'use client'

import { Fragment } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import { bundlePrice, cardImage, currentPrice, getGame } from '@/lib/games'
import { placeholderColor } from '@/lib/image-colors'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import styles from './Bundles.module.css'

function BundleCard({ bundle, currentSlug }) {
    const { hydrated, owns, cart, addBundleToCart, formatPrice } = useStore()
    const games = bundle.games.map(getGame)
    const ownsGame = hydrated ? owns : () => false
    const price = bundlePrice(bundle, ownsGame)
    const ownedCount = games.length - price.games.length
    const inCart = hydrated && cart.some((item) => item.id === `bundle:${bundle.slug}`)
    const complete = price.games.length === 0

    return (
        <li className={styles.card}>
            <header className={styles.header}>
                <div>
                    <h3>{bundle.title}</h3>
                    <p className={styles.description}>{bundle.description}</p>
                </div>
                <span className={styles.badge}>Save {bundle.discount}%</span>
            </header>

            <ul className={styles.games}>
                {games.map((game, i) => {
                    const owned = ownsGame(game.slug)
                    return (
                        <Fragment key={game.slug}>
                            {i > 0 && <li className={styles.plus} aria-hidden="true"><AddIcon fontSize="small" /></li>}
                            <li className={`${styles.game} ${owned ? styles.owned : ''}`}>
                                <Link href={`/games/${game.slug}`} className={styles.cover} style={{ backgroundColor: placeholderColor(cardImage(game)) }} aria-label={game.title}>
                                    <Image src={cardImage(game)} alt="" fill sizes="120px" />
                                    {owned && <span className={styles.ownedTag}><CheckIcon fontSize="inherit" /> Owned</span>}
                                    {game.slug === currentSlug && !owned && <span className={styles.thisGame}>This game</span>}
                                </Link>
                                <span className={styles.gameTitle}>{game.title}</span>
                                <span className={styles.gamePrice}>{owned ? 'Not charged' : formatPrice(currentPrice(game))}</span>
                            </li>
                        </Fragment>
                    )
                })}
            </ul>

            <footer className={styles.footer}>
                {complete ? (
                    <p className={styles.complete}><CheckIcon fontSize="small" /> You own every game in this bundle.</p>
                ) : (
                    <>
                        <div className={styles.summary}>
                            <p className={styles.priceLine}>
                                <s>{formatPrice(price.separate)}</s>
                                <strong>{formatPrice(price.price)}</strong>
                            </p>
                            <p className={styles.save}>
                                You save {formatPrice(price.savings)}
                                {ownedCount > 0 && <> · {ownedCount} owned {ownedCount === 1 ? 'game isn’t' : 'games aren’t'} charged</>}
                            </p>
                        </div>
                        {inCart ? (
                            <Button href="/cart" variant="secondary">In cart</Button>
                        ) : (
                            <Button onClick={() => addBundleToCart(bundle)} disabled={!hydrated}>
                                {ownedCount > 0 ? 'Complete the bundle' : 'Add bundle to cart'}
                            </Button>
                        )}
                    </>
                )}
            </footer>
        </li>
    )
}

export default function Bundles({ bundles, currentSlug }) {
    return (
        <section className={styles.section} aria-labelledby="bundles-title">
            <h2 id="bundles-title">Bundles with this game</h2>
            <ul className={styles.list}>
                {bundles.map((bundle) => <BundleCard key={bundle.slug} bundle={bundle} currentSlug={currentSlug} />)}
            </ul>
        </section>
    )
}
