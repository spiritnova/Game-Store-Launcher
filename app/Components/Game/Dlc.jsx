'use client'

import Image from 'next/image'
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import CheckIcon from '@mui/icons-material/Check'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import { dlcPrice } from '@/lib/games'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import styles from './Dlc.module.css'

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export default function Dlc({ game }) {
    const { hydrated, owns, dlcFor, cart, addDlcToCart, formatPrice } = useStore()
    const dlc = game.dlc ?? []
    if (dlc.length === 0) return null

    const ownsGame = hydrated && owns(game.slug)
    const owned = hydrated ? dlcFor(game.slug) : { bought: [], included: [], all: [] }

    return (
        <section id="dlc" className={styles.section} aria-labelledby="dlc-title">
            <div className={styles.header}>
                <h2 id="dlc-title">Downloadable content <span className={styles.count}>{dlc.length}</span></h2>
                {ownsGame ? (
                    <p className={styles.muted}>You own {owned.all.length} of {dlc.length}</p>
                ) : (
                    <p className={styles.muted}>Requires {game.title} to play</p>
                )}
            </div>

            <ul className={styles.list}>
                {dlc.map((item) => {
                    const price = dlcPrice(item)
                    const onSale = price < item.price
                    const included = owned.included.includes(item.id)
                    const bought = owned.bought.includes(item.id)
                    const inCart = hydrated && cart.some((c) => c.id === `dlc:${game.slug}:${item.id}`)
                    return (
                        <li key={item.id} className={styles.item}>
                            <div className={styles.media}>
                                <Image src={item.image} alt="" fill sizes="(max-width: 600px) 100vw, 230px" />
                            </div>
                            <div className={styles.body}>
                                <h3>{item.title}</h3>
                                {item.description && <p className={styles.description}>{item.description}</p>}
                                {item.releaseDate && <p className={styles.muted}>Released {formatDate(item.releaseDate)}</p>}
                            </div>
                            <div className={styles.buy}>
                                {!hydrated ? null : included || bought ? (
                                    <span className={styles.owned}>
                                        <CheckIcon fontSize="small" /> {included ? 'Included with your edition' : 'In your library'}
                                    </span>
                                ) : (
                                    <>
                                        <span className={styles.price}>
                                            {onSale && <span className={styles.discount}>-{Math.round((1 - price / item.price) * 100)}%</span>}
                                            {onSale && <s>{formatPrice(item.price)}</s>}
                                            <strong>{formatPrice(price)}</strong>
                                        </span>
                                        {inCart ? (
                                            <Button href="/cart" variant="secondary" size="small"><ShoppingCartIcon fontSize="small" /> In cart</Button>
                                        ) : (
                                            <Button size="small" onClick={() => addDlcToCart(game, item.id)} aria-label={`Add ${item.title} to cart`}>
                                                <AddShoppingCartIcon fontSize="small" /> Add to cart
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
