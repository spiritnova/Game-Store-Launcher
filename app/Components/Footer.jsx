import Link from 'next/link'
import EmailIcon from '@mui/icons-material/Email'
import GitHubIcon from '@mui/icons-material/GitHub'
import Logo from './UI/Logo'
import styles from './Footer.module.css'

const sections = [
    {
        title: 'Store',
        links: [
            { href: '/', label: 'Discover' },
            { href: '/games', label: 'Browse games' },
            { href: '/games?sale=1', label: 'Games on sale' },
            { href: '/news', label: 'News' },
        ],
    },
    {
        title: 'Your games',
        links: [
            { href: '/library', label: 'Library' },
            { href: '/downloads', label: 'Downloads' },
            { href: '/wishlist', label: 'Wishlist' },
            { href: '/cart', label: 'Cart' },
            { href: '/settings', label: 'Settings' },
            { href: '/about', label: 'About this project' },
        ],
    },
]

export default function Footer() {
  return (
    <footer className={styles.footer}>
        <div className={`container ${styles.content}`}>
            <div className={styles.brand}>
                <Logo height={52} />
                <p className={styles.text}>
                    A showcase game launcher built with Next.js. Discover deals, build a wishlist and
                    manage a library of installed games, all in your browser.
                </p>
            </div>

            {sections.map((section) => (
                <nav key={section.title} className={styles.column} aria-label={section.title}>
                    <h2 className={styles.header}>{section.title}</h2>
                    <ul className={styles.links}>
                        {section.links.map((link) => (
                            <li key={link.href}>
                                <Link href={link.href}>{link.label}</Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            ))}

            <div className={styles.column}>
                <h2 className={styles.header}>Contact</h2>
                <ul className={styles.links}>
                    <li>
                        <a href="mailto:ibrahimabboud2000@gmail.com" className={styles.iconLink}>
                            <EmailIcon fontSize="small" /> Email me
                        </a>
                    </li>
                    <li>
                        <a href="https://github.com/spiritnova/Game-Store-Launcher" className={styles.iconLink} target="_blank" rel="noreferrer">
                            <GitHubIcon fontSize="small" /> Source on GitHub
                        </a>
                    </li>
                </ul>
            </div>
        </div>

        <div className={styles.bottom}>
            <div className={`container ${styles.bottomRow}`}>
                <p>© {new Date().getFullYear()} Ultimate Game Launcher. A portfolio project, not a real store.</p>
                <p>Game titles and artwork are trademarks of their respective owners.</p>
            </div>
        </div>
    </footer>
  )
}
