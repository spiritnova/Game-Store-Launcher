'use client'

import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import { useStore } from '@/lib/store'
import Button from './Button'
import styles from './WishlistButton.module.css'

// variant "icon": small overlay button for cards. variant "full": labelled button for detail views.
export default function WishlistButton({ game, variant = 'icon' }) {
    const { hydrated, owns, isWishlisted, toggleWishlist } = useStore()

    if (!hydrated) return null

    if (owns(game.slug)) {
        return variant === 'icon' ? <span className={styles.owned}>In library</span> : null
    }

    const active = isWishlisted(game.slug)
    const label = active ? `Remove ${game.title} from wishlist` : `Add ${game.title} to wishlist`

    if (variant === 'full') {
        return (
            <Button variant="ghost" aria-pressed={active} onClick={() => toggleWishlist(game)}>
                {active ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                {active ? 'On wishlist' : 'Add to wishlist'}
            </Button>
        )
    }

    return (
        <button
            type="button"
            className={`${styles.icon} ${active ? styles.active : ''}`}
            aria-pressed={active}
            aria-label={label}
            data-tooltip={active ? 'On wishlist' : 'Add to wishlist'}
            onClick={() => toggleWishlist(game)}
        >
            {active ? <CheckIcon fontSize="small" /> : <AddIcon fontSize="small" />}
        </button>
    )
}
