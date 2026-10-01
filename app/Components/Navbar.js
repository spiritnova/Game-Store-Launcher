'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import SearchIcon from '@mui/icons-material/Search'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import { useStore } from '@/lib/store'
import Logo from './UI/Logo'
import styles from './Navbar.module.css'

const links = [
    { href: '/', label: 'Discover' },
    { href: '/games', label: 'Browse' },
    { href: '/library', label: 'Library' },
    { href: '/news', label: 'News' },
    { href: '/about', label: 'About' },
]

function SearchForm({ id, className }) {
    const router = useRouter()
    const [query, setQuery] = useState('')

    function handleSubmit(e) {
        e.preventDefault()
        const q = query.trim()
        router.push(q ? `/games?q=${encodeURIComponent(q)}` : '/games')
        setQuery('')
    }

    return (
        <form role="search" className={`${styles.search} ${className}`} onSubmit={handleSubmit}>
            <SearchIcon className={styles.searchIcon} fontSize="small" />
            <label className="visually-hidden" htmlFor={id}>Search games</label>
            <input
                id={id}
                type="search"
                placeholder="Search games"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
        </form>
    )
}

export default function Navbar(){
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    const { hydrated, wishlist } = useStore()

    // Close the mobile menu after navigating
    useEffect(() => {
        setOpen(false)
    }, [pathname])

    useEffect(() => {
        if (!open) return
        const onKeyDown = (e) => e.key === 'Escape' && setOpen(false)
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [open])

    const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
    // The browse page has its own search field
    const showSearch = pathname !== '/games'

    return(
        <header className={styles.nav}>
            <Link href="/" className={styles.brand} aria-label="Ultimate home">
                <Logo/>
            </Link>

            <nav
                id="main-menu"
                aria-label="Main"
                className={`${styles.menu} ${open ? styles.open : ''}`}
            >
                {showSearch && <SearchForm id="mobile-search" className={styles.mobileSearch} />}
                <ul className={styles.navLinks}>
                    {links.map(({ href, label }) => (
                        <li key={href} className={styles.navItems}>
                            <Link
                                href={href}
                                className={isActive(href) ? styles.active : undefined}
                                aria-current={isActive(href) ? 'page' : undefined}
                            >
                                {label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className={styles.tools}>
                {showSearch && <SearchForm id="desktop-search" className={styles.desktopSearch} />}

                <Link
                    href="/wishlist"
                    className={`${styles.wishlist} ${isActive('/wishlist') ? styles.wishlistActive : ''}`}
                    aria-label={hydrated ? `Wishlist (${wishlist.length})` : 'Wishlist'}
                >
                    <FavoriteBorderIcon />
                    {hydrated && wishlist.length > 0 && <span className={styles.badge} aria-hidden="true">{wishlist.length}</span>}
                </Link>

                <button
                    type="button"
                    className={`${styles.burger} ${open ? styles.burgerOpen : ''}`}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    aria-expanded={open}
                    aria-controls="main-menu"
                    onClick={() => setOpen((prev) => !prev)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </header>
    )
}
