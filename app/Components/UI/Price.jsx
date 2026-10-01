import { discountPercent, formatPrice, isOnSale } from '@/lib/games'
import styles from './Price.module.css'

// `hideBadge` drops the discount pill (cards show it on the cover instead).
export default function Price({ game, size, hideBadge = false }) {
    const classes = [styles.prices, size && styles[size]].filter(Boolean).join(' ')

    if (game.price === 0) {
        return <div className={classes}><span className={`${styles.current} ${styles.free}`}>Free</span></div>
    }

    if (!isOnSale(game)) {
        return <div className={classes}><span className={styles.current}>{formatPrice(game.price)}</span></div>
    }

    return (
        <div className={classes}>
            {!hideBadge && <span className={styles.badge}>-{discountPercent(game)}%</span>}
            <s className={styles.original}>
                <span className="visually-hidden">Original price </span>{formatPrice(game.price)}
            </s>
            <span className={styles.current}>
                <span className="visually-hidden">Sale price </span>{formatPrice(game.salePrice)}
            </span>
        </div>
    )
}
