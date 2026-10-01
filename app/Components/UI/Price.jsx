import { discountPercent, formatPrice, isOnSale } from '@/lib/games'
import styles from './Price.module.css'

export default function Price({ game, size }) {
    const classes = [styles.prices, size && styles[size]].filter(Boolean).join(' ')

    if (!isOnSale(game)) {
        return <div className={classes}><span className={styles.current}>{formatPrice(game.price)}</span></div>
    }

    return (
        <div className={classes}>
            <span className={styles.badge}>-{discountPercent(game)}%</span>
            <s className={styles.original}>
                <span className="visually-hidden">Original price </span>{formatPrice(game.price)}
            </s>
            <span className={styles.current}>
                <span className="visually-hidden">Sale price </span>{formatPrice(game.salePrice)}
            </span>
        </div>
    )
}
