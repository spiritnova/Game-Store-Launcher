'use client'

import CheckIcon from '@mui/icons-material/Check'
import { editionPrice, getEdition, isOnSale } from '@/lib/games'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import styles from './Editions.module.css'

export default function Editions({ game }) {
    const { hydrated, getEntry, cartItemFor, addToCart, formatPrice } = useStore()
    const entry = hydrated ? getEntry(game.slug) : null
    const cartItem = hydrated ? cartItemFor(game.slug) : null

    return (
        <section id="editions" className={styles.section} aria-labelledby="editions-title">
            <h2 id="editions-title">Editions</h2>
            {entry && (
                <p className={styles.owned}>
                    <CheckIcon fontSize="small" /> You own the {getEdition(game, entry.edition).name}.
                </p>
            )}
            <ul className={styles.list}>
                {game.editions.map((edition) => {
                    const price = editionPrice(game, edition)
                    const inCart = cartItem?.type === 'game' && cartItem.edition === edition.id
                    return (
                        <li key={edition.id} className={`${styles.card} ${edition.id !== 'standard' ? styles.premium : ''}`}>
                            <h3>{edition.name}</h3>
                            <ul className={styles.includes}>
                                <li><CheckIcon fontSize="inherit" /> {game.title}</li>
                                {edition.includes.map((item) => (
                                    <li key={item}><CheckIcon fontSize="inherit" /> {item}</li>
                                ))}
                            </ul>
                            <div className={styles.footer}>
                                <p className={styles.price}>
                                    {isOnSale(game) && <s>{formatPrice(edition.price)}</s>}
                                    <span>{formatPrice(price)}</span>
                                </p>
                                {!entry && (
                                    inCart ? (
                                        <Button href="/cart" variant="secondary" size="small">In cart</Button>
                                    ) : (
                                        <Button
                                            size="small"
                                            variant={edition.id === 'standard' ? 'ghost' : 'primary'}
                                            onClick={() => addToCart(game, edition.id)}
                                            disabled={!hydrated}
                                            aria-label={`Add ${game.title} ${edition.name} to cart`}
                                        >
                                            {cartItem?.type === 'game' ? 'Switch to this edition' : 'Add to cart'}
                                        </Button>
                                    )
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
