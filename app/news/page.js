import Image from 'next/image'
import Link from 'next/link'
import news from '@/data/news.json'
import styles from './page.module.css'

export const metadata = {
  title: 'News',
  description: 'Sales, launcher updates and spotlights from the Ultimate store.',
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export default function News() {
  const [lead, ...rest] = news

  return (
    <main className="container">
      <header className={styles.header}>
        <h1>News</h1>
        <p>Sales, launcher updates and spotlights from the Ultimate store.</p>
      </header>

      <article className={styles.lead}>
        <div className={styles.leadImage}>
          <Image src={lead.image} alt="" fill priority sizes="(max-width: 900px) 100vw, 50vw" />
        </div>
        <div className={styles.leadBody}>
          <p className={styles.meta}>
            <span className={styles.category}>{lead.category}</span>
            <time dateTime={lead.date}>{formatDate(lead.date)}</time>
          </p>
          <h2>{lead.title}</h2>
          <p>{lead.excerpt}</p>
          <Link href={lead.href} className={styles.cta}>{lead.cta} →</Link>
        </div>
      </article>

      <ul className={styles.grid}>
        {rest.map((post) => (
          <li key={post.slug}>
            <article className={styles.card}>
              <div className={styles.cardImage}>
                <Image src={post.image} alt="" fill sizes="(max-width: 600px) 100vw, 33vw" />
              </div>
              <div className={styles.cardBody}>
                <p className={styles.meta}>
                  <span className={styles.category}>{post.category}</span>
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                </p>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <Link href={post.href} className={styles.cta}>{post.cta} →</Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </main>
  )
}
