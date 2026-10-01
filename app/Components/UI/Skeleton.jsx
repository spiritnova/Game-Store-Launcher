import styles from './Skeleton.module.css'

export default function Skeleton({ width = '100%', height = '1rem', radius, className }) {
    return (
        <span
            aria-hidden="true"
            className={[styles.skeleton, className].filter(Boolean).join(' ')}
            style={{ width, height, borderRadius: radius }}
        />
    )
}

export function CardGridSkeleton({ count = 8 }) {
    return (
        <div className={styles.grid} aria-busy="true" aria-label="Loading">
            {Array.from({ length: count }, (_, i) => (
                <div key={i}>
                    <Skeleton className={styles.cover} />
                    <Skeleton width="80%" height="1rem" />
                    <Skeleton width="40%" height="1rem" />
                </div>
            ))}
        </div>
    )
}
