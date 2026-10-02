'use client'

import Image from 'next/image'
import Link from 'next/link'
import CheckIcon from '@mui/icons-material/Check'
import { allBundles, bundlePrice, cardImage, getGame } from '@/lib/games'
import { placeholderColor } from '@/lib/image-colors'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import SectionHeader from '../UI/SectionHeader'
import styles from './BundleShowcase.module.css'

const FEATURED = ['indie-darlings', 'horror-night', 'soulslike-starter-pack', 'strategy-masters']

function BundleTile({ bundle }) {
    const { hydrated, owns, cart, addBundleToCart, formatPrice } = useStore()
    const games = bundle.games.map(getGame)
    const ownsGame = hydrated ? owns : () => false
    const price = bundlePrice(bundle, ownsGame)
    const inCart = hydrated && cart.some((item) => item.id === `bundle:${bundle.slug}`)

    return (
        <li className={styles.tile}>
            <Link href={`/games/${bundle.games[0]}`} className={styles.collage} aria-label={`${bundle.title}: view ${games[0].title}`}>
                {games.slice(0, 4).map((game) => (
                    <span key={game.slug} className={styles.cover} style={{ backgroundColor: placeholderColor(cardImage(game)) }}>
                        <Image src={cardImage(game)} alt="" fill sizes="110px" />
                    </span>
                ))}
                <span className={styles.badge}>-{bundle.discount}%</span>
            </Link>
            <div className={styles.body}>
                <h3>{bundle.title}</h3>
                <p>{games.map((game) => game.title).join(', ')}</p>
            </div>
            <div className={styles.buy}>
                {price.games.length === 0 ? (
                    <p className={styles.owned}><CheckIcon fontSize="small" /> You own all of these</p>
                ) : (
                    <>
                        <p className={styles.price}>
                            <s>{formatPrice(price.separate)}</s> <strong>{formatPrice(price.price)}</strong>
                        </p>
                        {inCart ? (
                            <Button href="/cart" variant="secondary" size="small">In cart</Button>
                        ) : (
                            <Button size="small" onClick={() => addBundleToCart(bundle)} disabled={!hydrated}>Add bundle</Button>
                        )}
                    </>
                )}
            </div>
        </li>
    )
}

export default function BundleShowcase() {
    const bundles = FEATURED.map((slug) => allBundles.find((b) => b.slug === slug)).filter(Boolean)

    return (
        <section className={`container ${styles.section}`} aria-labelledby="bundles-home-title">
            <SectionHeader id="bundles-home-title" title="Bundles and collections" subtitle="Buy more, save more. Games you already own are never charged." />
            <ul className={styles.grid}>
                {bundles.map((bundle) => <BundleTile key={bundle.slug} bundle={bundle} />)}
            </ul>
        </section>
    )
}
