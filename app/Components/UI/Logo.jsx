import Image from 'next/image'
import styles from './Logo.module.css'

// Assets come from `npm run brand`. `compact` shows just the icon.
export default function Logo({ height = 40, priority = false, compact = false }) {
    if (compact) return <Image src="/icon.png" alt="Ultimate Game Launcher" width={height} height={height} priority={priority} unoptimized />

    const width = Math.round(height * (507 / 140))
    const size = { width, height, style: { width, height } }

    return (
        <span className={styles.logo}>
            <Image src="/brand/wordmark-on-dark.png" alt="Ultimate Game Launcher" {...size} priority={priority} className={styles.onDark} />
            <Image src="/brand/wordmark-on-light.png" alt="" aria-hidden="true" {...size} className={styles.onLight} />
        </span>
    )
}
