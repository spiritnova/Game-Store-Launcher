import Link from 'next/link'
import news from '@/data/news.json'
import NewsArt from '../News/NewsArt'
import SectionHeader from '../UI/SectionHeader'
import styles from './NewsStrip.module.css'

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export default function NewsStrip() {
    return (
        <section className={`container ${styles.section}`} aria-labelledby="news-home-title">
            <SectionHeader id="news-home-title" title="Latest news" subtitle="Sales, store updates and spotlights" href="/news" />
            <ul className={styles.grid}>
                {news.slice(0, 3).map((post) => (
                    <li key={post.slug}>
                        <Link href={post.href} className={styles.card}>
                            <div className={styles.image}>
                                <NewsArt post={post} sizes="(max-width: 700px) 100vw, 30vw" />
                                <span className={styles.category}>{post.category}</span>
                            </div>
                            <div className={styles.body}>
                                <time dateTime={post.date}>{formatDate(post.date)}</time>
                                <h3>{post.title}</h3>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}
