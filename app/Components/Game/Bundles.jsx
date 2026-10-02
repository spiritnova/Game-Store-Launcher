'use client'

import Image from 'next/image'
import Link from 'next/link'
import CheckIcon from '@mui/icons-material/Check'
import { bundlePrice, cardImage, getGame } from '@/lib/games'
import { placeholderColor } from '@/lib/image-colors'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import styles from './Bundles.module.css'

function BundleCard({ bundle }) {
    const { hydrated, owns, cart, addBundleToCart, formatPrice } = useStore()
    const games = bundle.games.map(getGame)
    const ownsGame = hydrated ? owns : () => false
    const price = bundlePrice(bundle, ownsGame)
    const ownedCount = games.length - price.games.length
    const inCart = hydrated && cart.some((item) => item.id === `bundle:${bundle.slug}`)

    return (
        <li className={styles.card}>
            <div className={styles.collage} aria-hidden="true">
                {games.slice(0, 4).map((game) => (
                    <div key={game.slug} className={styles.tile} style={{ backgroundColor: placeholderColor(cardImage(game)) }}>
                        <Image src={cardImage(game)} alt="" fill sizes="80px" />
                    </div>
                ))}
            </div>

            <div className={styles.body}>
                <h3>{bundle.title}</h3>
                <p className={styles.description}>{bundle.description}</p>
                <ul className={styles.games}>
                    {games.map((game) => (
                        <li key={game.slug}>
                            <Link href={`/games/${game.slug}`}>{game.title}</Link>
                            {ownsGame(game.slug) && <span className={styles.ownedTag}><CheckIcon fontSize="inherit" /> Owned</span>}
                        </li>
                    ))}
                </ul>
            </div>

            <div className={styles.buy}>
                {price.games.length === 0 ? (
                    <p className={styles.complete}><CheckIcon fontSize="small" /> You own every game in this bundle.</p>
                ) : (
                    <>
                        {ownedCount > 0 && (
                            <p className={styles.note}>Complete the set: you already own {ownedCount} of {games.length}, so they aren&apos;t charged.</p>
                        )}
                        <div className={styles.priceRow}>
                            <span className={styles.badge}>-{bundle.discount}%</span>
                            <s>{formatPrice(price.separate)}</s>
                            <span className={styles.price}>{formatPrice(price.price)}</span>
                        </div>
                        {inCart ? (
                            <Button href="/cart" variant="secondary" size="small">In cart</Button>
                        ) : (
                            <Button size="small" onClick={() => addBundleToCart(bundle)} disabled={!hydrated}>
                                Add bundle to cart
                            </Button>
                        )}
                    </>
                )}
            </div>
        </li>
    )
}

export default function Bundles({ bundles }) {
    return (
        <section className={styles.section} aria-labelledby="bundles-title">
            <h2 id="bundles-title">Bundles with this game</h2>
            <ul className={styles.list}>
                {bundles.map((bundle) => <BundleCard key={bundle.slug} bundle={bundle} />)}
            </ul>
        </section>
    )
}
