import styles from './ProgressBar.module.css'

export default function ProgressBar({ value, label }) {
    const percent = Math.floor(value)

    return (
        <div className={styles.wrapper}>
            <div
                className={styles.track}
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
            >
                <div className={styles.fill} style={{ width: `${percent}%` }} />
            </div>
            <span className={styles.value}>{percent}%</span>
        </div>
    )
}
