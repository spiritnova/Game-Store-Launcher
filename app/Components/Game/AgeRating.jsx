import styles from './AgeRating.module.css'

const ESRB_NAMES = { E: 'Everyone', 'E10+': 'Everyone 10+', T: 'Teen', M: 'Mature 17+', AO: 'Adults Only 18+', RP: 'Rating Pending' }

// The age a visitor must confirm before seeing a game's page: Steam's own age check, or the rating's minimum age.
export function gateAge(rating) {
    if (!rating) return 0
    const esrb = { M: 17, AO: 18 }[rating.esrb?.rating] ?? 0
    const pegi = rating.pegi?.rating === '18' ? 18 : 0
    return Math.max(rating.requiredAge ?? 0, esrb, pegi)
}

// ESRB and PEGI ratings with their content descriptors, as listed on the game's store page.
export default function AgeRating({ rating }) {
    if (!rating?.esrb && !rating?.pegi) {
        return (
            <section className={styles.rating} aria-label="Age rating">
                <p className={styles.none}>Not rated. Check the publisher’s store page for age guidance.</p>
            </section>
        )
    }

    return (
        <section className={styles.rating} aria-label="Age rating">
            {rating.esrb && (
                <div className={styles.row}>
                    <span className={`${styles.badge} ${styles.esrb}`} title={`ESRB: ${ESRB_NAMES[rating.esrb.rating]}`}>
                        <span className={styles.board}>ESRB</span>
                        {rating.esrb.rating}
                    </span>
                    <div>
                        <p className={styles.name}>{ESRB_NAMES[rating.esrb.rating]}</p>
                        {rating.esrb.descriptors.length > 0 && <p className={styles.descriptors}>{rating.esrb.descriptors.join(', ')}</p>}
                    </div>
                </div>
            )}
            {rating.pegi && (
                <div className={styles.row}>
                    <span className={`${styles.badge} ${styles[`pegi${rating.pegi.rating}`]}`} title={`PEGI ${rating.pegi.rating}`}>
                        <span className={styles.board}>PEGI</span>
                        {rating.pegi.rating}
                    </span>
                    <div>
                        <p className={styles.name}>PEGI {rating.pegi.rating}</p>
                        {rating.pegi.descriptors.length > 0 && <p className={styles.descriptors}>{rating.pegi.descriptors.join(', ')}</p>}
                    </div>
                </div>
            )}
        </section>
    )
}
