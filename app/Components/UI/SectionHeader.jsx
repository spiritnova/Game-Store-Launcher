import Link from 'next/link'
import styles from './SectionHeader.module.css'

export default function SectionHeader({ id, title, subtitle, href, hrefLabel = 'See all', children }) {
    return (
        <div className={styles.header}>
            <div>
                <h2 id={id} className={styles.title}>{title}</h2>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            <div className={styles.actions}>
                {href && <Link href={href} className={styles.link}>{hrefLabel} <span aria-hidden="true">→</span></Link>}
                {children}
            </div>
        </div>
    )
}
