'use client'

import CheckIcon from '@mui/icons-material/Check'
import UpgradeIcon from '@mui/icons-material/Upgrade'
import { editionPrice, getEdition, isOnSale, upgradePrice } from '@/lib/games'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import styles from './Editions.module.css'

// What an edition's card offers: buy it, upgrade to it, or show that you already have it.
function EditionAction({ game, edition, entry, cartItem }) {
    const { hydrated, cart, dlcFor, addToCart, addUpgradeToCart, formatPrice } = useStore()

    if (entry) {
        const owned = getEdition(game, entry.edition)
        if (edition.id === owned.id) return <span className={styles.yours}><CheckIcon fontSize="small" /> Your edition</span>
        if (edition.price <= owned.price) return <span className={styles.included}>Everything here is in your edition</span>

        const upgrade = upgradePrice(game, owned.id, edition.id, dlcFor(game.slug).bought)
        const inCart = cart.some((item) => item.type === 'upgrade' && item.slug === game.slug && item.edition === edition.id)
        return (
            <div className={styles.upgrade}>
                <p className={styles.price}>
                    {upgrade.price < upgrade.original && <s>{formatPrice(upgrade.original)}</s>}
                    <span>{formatPrice(upgrade.price)}</span>
                </p>
                {upgrade.credit > 0 && <p className={styles.credit}>Includes {formatPrice(upgrade.credit)} off for DLC you already own</p>}
                {inCart ? (
                    <Button href="/cart" variant="secondary" size="small">In cart</Button>
                ) : (
                    <Button size="small" onClick={() => addUpgradeToCart(game, edition.id)} aria-label={`Upgrade to the ${edition.name}`}>
                        <UpgradeIcon fontSize="small" /> Upgrade
                    </Button>
                )}
            </div>
        )
    }

    const inCart = cartItem?.type === 'game' && cartItem.edition === edition.id
    return (
        <>
            <p className={styles.price}>
                {isOnSale(game) && <s>{formatPrice(edition.price)}</s>}
                <span>{formatPrice(editionPrice(game, edition))}</span>
            </p>
            {inCart ? (
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
            )}
        </>
    )
}

export default function Editions({ game }) {
    const { hydrated, getEntry, cartItemFor } = useStore()
    const entry = hydrated ? getEntry(game.slug) : null
    const cartItem = hydrated ? cartItemFor(game.slug) : null
    const owned = entry && getEdition(game, entry.edition)
    const canUpgrade = owned && game.editions.some((edition) => edition.price > owned.price)

    return (
        <section id="editions" className={styles.section} aria-labelledby="editions-title">
            <h2 id="editions-title">Editions</h2>
            {owned && (
                <p className={styles.owned}>
                    <CheckIcon fontSize="small" /> You own the {owned.name}.
                    {canUpgrade && ' Upgrade for the difference in price; anything you already own is credited.'}
                </p>
            )}
            <ul className={styles.list}>
                {game.editions.map((edition) => (
                    <li key={edition.id} className={`${styles.card} ${edition.id !== 'standard' ? styles.premium : ''} ${owned?.id === edition.id ? styles.current : ''}`}>
                        <h3>{edition.name}</h3>
                        <ul className={styles.includes}>
                            <li><CheckIcon fontSize="inherit" /> {game.title}</li>
                            {edition.includes.map((item) => (
                                <li key={item}><CheckIcon fontSize="inherit" /> {item}</li>
                            ))}
                        </ul>
                        <div className={styles.footer}>
                            <EditionAction game={game} edition={edition} entry={entry} cartItem={cartItem} />
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    )
}
