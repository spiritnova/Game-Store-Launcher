'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SearchIcon from '@mui/icons-material/Search'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import VideogameAssetOutlinedIcon from '@mui/icons-material/VideogameAssetOutlined'
import { cardImage, getGame } from '@/lib/games'
import { formatSpeed, useDownloads } from '@/lib/downloads'
import { useStore } from '@/lib/store'
import Avatar from './UI/Avatar'
import Button from './UI/Button'
import Logo from './UI/Logo'
import ProgressBar from './UI/ProgressBar'
import styles from './Sidebar.module.css'

function SearchForm() {
    const router = useRouter()
    const [query, setQuery] = useState('')

    function handleSubmit(e) {
        e.preventDefault()
        const q = query.trim()
        router.push(q ? `/games?q=${encodeURIComponent(q)}` : '/games')
        setQuery('')
    }

    return (
        <form role="search" className={styles.search} onSubmit={handleSubmit}>
            <SearchIcon className={styles.searchIcon} fontSize="small" />
            <label className="visually-hidden" htmlFor="sidebar-search">Search games</label>
            <input
                id="sidebar-search"
                type="search"
                placeholder="Search store"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
        </form>
    )
}

function NavLink({ href, icon: Icon, label, count, active, onNavigate }) {
    return (
        <li>
            <Link
                href={href}
                className={`${styles.link} ${active ? styles.active : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => {
                    // Plain left clicks only: ctrl/cmd-click opens a new tab and shouldn't move the highlight
                    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) onNavigate(href)
                }}
            >
                <Icon fontSize="small" />
                <span className={styles.label}>{label}</span>
                {count > 0 && (
                    <span className={styles.count}>
                        {count}
                        <span className="visually-hidden"> {count === 1 ? 'item' : 'items'}</span>
                    </span>
                )}
            </Link>
        </li>
    )
}

// Download UI subscribes to the downloads context on its own, so the rest of the
// sidebar doesn't re-render on every download tick.
function DownloadsNavLink(props) {
    const { queue } = useDownloads()
    return <NavLink {...props} count={queue.length} />
}

function DownloadsPanel() {
    const { active, queue, speed } = useDownloads()
    if (!active) return null
    const game = getGame(active.slug)
    const progress = (active.downloadedGB / game.sizeGB) * 100

    return (
        <section className={styles.panel} aria-labelledby="downloads-title">
            <h2 id="downloads-title" className={styles.section}>Downloading</h2>
            <Link href="/downloads" className={styles.download}>
                <p className={styles.downloadTitle}>{game.title}</p>
                <ProgressBar value={progress} label={`Downloading ${game.title}`} />
                <p className={styles.downloadMeta}>
                    {formatSpeed(speed)}
                    {queue.length > 1 && <> · {queue.length - 1} queued</>}
                </p>
            </Link>
        </section>
    )
}

export default function Sidebar(){
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    // The link that was just clicked: highlighted immediately, before the new page has loaded
    const [pendingHref, setPendingHref] = useState(null)
    const { hydrated, user, library, wishlist, cart, play, signOut } = useStore()
    const menuButton = useRef(null)
    const closeButton = useRef(null)

    // Navigation finished: close the drawer and drop the pending highlight
    useEffect(() => {
        setOpen(false)
        setPendingHref(null)
    }, [pathname])

    // While the mobile drawer is open: Escape closes it, focus moves into it and the page behind can't scroll.
    useEffect(() => {
        if (!open) return
        const onKeyDown = (e) => e.key === 'Escape' && setOpen(false)
        const opener = menuButton.current
        document.addEventListener('keydown', onKeyDown)
        document.body.style.overflow = 'hidden'
        closeButton.current?.focus()
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = ''
            opener?.focus()
        }
    }, [open])

    const current = pendingHref ?? pathname
    const isActive = (href) => (href === '/' ? current === '/' : current.startsWith(href))
    const onNavigate = (href) => href !== pathname && setPendingHref(href)
    const link = (href) => ({ href, active: isActive(href), onNavigate })
    const counts = hydrated ? { library: library.length, wishlist: wishlist.length, cart: cart.length } : {}

    const quickLaunch = library
        .filter((entry) => entry.installed)
        .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
        .slice(0, 4)
        .map((entry) => getGame(entry.slug))

    return(
        <>
            <header className={styles.topbar}>
                <button
                    ref={menuButton}
                    type="button"
                    className={styles.iconButton}
                    aria-label="Open menu"
                    aria-expanded={open}
                    aria-controls="sidebar"
                    onClick={() => setOpen(true)}
                >
                    <MenuIcon />
                </button>
                <Link href="/" className={styles.brand} aria-label="Ultimate home">
                    <Logo/>
                </Link>
                <Link href="/cart" className={styles.iconButton} aria-label={`Cart${counts.cart ? ` (${counts.cart})` : ''}`}>
                    <ShoppingCartOutlinedIcon />
                    {counts.cart > 0 && <span className={styles.badge} aria-hidden="true">{counts.cart}</span>}
                </Link>
            </header>

            <div className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

            <aside id="sidebar" className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Sidebar">
                <div className={styles.header}>
                    <Link href="/" className={styles.brand} aria-label="Ultimate home">
                        <Logo/>
                    </Link>
                    <button
                        ref={closeButton}
                        type="button"
                        className={`${styles.iconButton} ${styles.close}`}
                        aria-label="Close menu"
                        onClick={() => setOpen(false)}
                    >
                        <CloseIcon />
                    </button>
                </div>

                <SearchForm />

                {/* Only this middle part scrolls, so the profile stays pinned at the bottom */}
                <div className={styles.scroll}>
                <nav aria-label="Main" className={styles.nav}>
                    <h2 className={styles.section}>Store</h2>
                    <ul>
                        <NavLink {...link('/')} icon={HomeOutlinedIcon} label="Discover" />
                        <NavLink {...link('/games')} icon={GridViewOutlinedIcon} label="Browse" />
                        <NavLink {...link('/news')} icon={NewspaperOutlinedIcon} label="News" />
                    </ul>

                    <h2 className={styles.section}>Your games</h2>
                    <ul>
                        <NavLink {...link('/library')} icon={VideogameAssetOutlinedIcon} label="Library" count={counts.library} />
                        <DownloadsNavLink {...link('/downloads')} icon={DownloadIcon} label="Downloads" />
                        <NavLink {...link('/wishlist')} icon={FavoriteBorderIcon} label="Wishlist" count={counts.wishlist} />
                        <NavLink {...link('/cart')} icon={ShoppingCartOutlinedIcon} label="Cart" count={counts.cart} />
                    </ul>
                </nav>

                <DownloadsPanel />

                {quickLaunch.length > 0 && (
                    <section className={styles.panel} aria-labelledby="quick-launch-title">
                        <h2 id="quick-launch-title" className={styles.section}>Quick launch</h2>
                        <ul className={styles.quick}>
                            {quickLaunch.map((game) => (
                                <li key={game.slug}>
                                    <Link href={`/games/${game.slug}`} className={styles.quickGame}>
                                        <span className={styles.thumb}>
                                            <Image src={cardImage(game)} alt="" fill sizes="32px" />
                                        </span>
                                        <span className={styles.quickTitle}>{game.title}</span>
                                    </Link>
                                    <button
                                        type="button"
                                        className={styles.playButton}
                                        onClick={() => play(game)}
                                        aria-label={`Play ${game.title}`}
                                        title="Play"
                                    >
                                        <PlayArrowIcon fontSize="small" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                </div>

                <div className={styles.footer}>
                    <ul>
                        <NavLink {...link('/about')} icon={InfoOutlinedIcon} label="About" />
                    </ul>

                    {!hydrated ? (
                        <div className={styles.profilePlaceholder} />
                    ) : user ? (
                        <div className={styles.profile}>
                            <Link
                                href="/settings"
                                className={`${styles.profileLink} ${isActive('/settings') ? styles.profileActive : ''}`}
                                aria-label={`${user.displayName}, open profile and settings`}
                                aria-current={isActive('/settings') ? 'page' : undefined}
                                onClick={() => onNavigate('/settings')}
                            >
                                <Avatar user={user} />
                                <span className={styles.profileText}>
                                    <span className={styles.name}>{user.displayName}</span>
                                    <span className={styles.username}>Profile &amp; settings</span>
                                </span>
                            </Link>
                            <button type="button" className={styles.iconButton} onClick={signOut} aria-label="Sign out" title="Sign out">
                                <LogoutIcon fontSize="small" />
                            </button>
                        </div>
                    ) : (
                        <Button href={`/signin?next=${encodeURIComponent(pathname)}`} variant="secondary" className={styles.signIn}>
                            Sign in
                        </Button>
                    )}
                </div>
            </aside>
        </>
    )
}
