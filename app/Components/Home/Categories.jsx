import Image from 'next/image'
import Link from 'next/link'
import { getGenreStats } from '@/lib/games'
import { blurProps } from '@/lib/images'
import styles from './Categories.module.css'

export default function Categories() {
    const stats = getGenreStats()

    return (
        <section className={`container ${styles.section}`} aria-labelledby="categories-title">
            <h2 id="categories-title" className={styles.title}>Browse by category</h2>
            <ul className={styles.grid}>
                {stats.map(({ name, count, banner }) => (
                    <li key={name}>
                        <Link href={`/games?genre=${encodeURIComponent(name)}`} className={styles.tile}>
                            {banner && (
                                <Image src={banner} alt="" fill sizes="(max-width: 600px) 50vw, 240px" {...blurProps(banner)} />
                            )}
                            <span className={styles.label}>
                                <span className={styles.name}>{name}</span>
                                <span className={styles.count}>{count} {count === 1 ? 'game' : 'games'}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}
