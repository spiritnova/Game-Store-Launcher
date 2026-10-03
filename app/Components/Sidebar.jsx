'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import CloseIcon from '@mui/icons-material/Close'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import StopIcon from '@mui/icons-material/Stop'
import VideogameAssetOutlinedIcon from '@mui/icons-material/VideogameAssetOutlined'
import { cardImage, getGame, isReleased } from '@/lib/games'
import { formatSpeed, statusLabel, useDownloads } from '@/lib/downloads'
import { STATUSES, useStore } from '@/lib/store'
import { useNow } from '@/lib/useNow'
import Avatar from './UI/Avatar'
import Logo from './UI/Logo'
import Menu from './UI/Menu'
import Notifications from './UI/Notifications'
import { PresenceDot, presenceLabel, usePresence } from './UI/Presence'
import ProgressBar from './UI/ProgressBar'
import SearchBox from './SearchBox'
import styles from './Sidebar.module.css'

function NavLink({ href, icon: Icon, label, count, countLabel, active, onNavigate }) {
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
                        <span className="visually-hidden"> {countLabel ?? (count === 1 ? 'item' : 'items')}</span>
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
    const downloads = useDownloads()
    const { settings } = useStore()
    const { current, running, queue, speed } = downloads
    if (!current) return null
    const game = getGame(current.slug)
    const status = downloads.statusOf(current.slug)
    const paused = status.status === 'paused'

    return (
        <section className={styles.panel} aria-labelledby="downloads-title">
            <h2 id="downloads-title" className={styles.section}>{statusLabel(status)}</h2>
            <Link href="/downloads" className={styles.download}>
                <p className={styles.downloadTitle}>{game.title}</p>
                <ProgressBar value={status.progress} label={`${statusLabel(status)} ${game.title}`} />
                <p className={`${styles.downloadMeta} ${paused ? styles.downloadPaused : ''}`}>
                    {running ? formatSpeed(speed, settings.showBits) : paused ? 'Paused · click to resume' : 'Waiting for schedule'}
                    {queue.length > 1 && <> · {queue.length - 1} queued</>}
                </p>
            </Link>
        </section>
    )
}

// The running game, with a session timer and a way to close it.
function NowPlaying() {
    const { playing, stopPlaying } = useStore()
    const now = useNow(1000)
    if (!playing) return null
    const game = getGame(playing.slug)
    const minutes = Math.max(0, Math.floor(((now - playing.startedAt) / 1000) * playing.scale))
    const session = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`

    return (
        <section className={`${styles.panel} ${styles.nowPlaying}`} aria-labelledby="now-playing-title">
            <h2 id="now-playing-title" className={styles.section}>Now playing</h2>
            <div className={styles.playingRow}>
                <Link href={`/games/${game.slug}`} className={styles.quickGame}>
                    <span className={styles.thumb}>
                        <Image src={cardImage(game)} alt="" fill sizes="32px" />
                    </span>
                    <span className={styles.profileText}>
                        <span className={styles.quickTitle}>{game.title}</span>
                        <span className={styles.downloadMeta}>{session} this session</span>
                    </span>
                </Link>
                <button type="button" className={styles.iconButton} onClick={stopPlaying} aria-label={`Close ${game.title}`} title="Stop playing">
                    <StopIcon fontSize="small" />
                </button>
            </div>
        </section>
    )
}

function FriendsPanel() {
    const { friends, profileOf } = useStore()
    const statusOf = usePresence()
    const now = useNow(60000)
    const online = friends
        .map((f) => ({ ...profileOf(f.username), status: statusOf(f.username, now) }))
        .filter((f) => f.status.state !== 'offline')
        .sort((a, b) => (a.status.state === 'playing' ? -1 : 0) - (b.status.state === 'playing' ? -1 : 0))
    if (online.length === 0) return null

    return (
        <section className={styles.panel} aria-labelledby="friends-online-title">
            <h2 id="friends-online-title" className={styles.section}>Friends online · {online.length}</h2>
            <ul className={styles.quick}>
                {online.slice(0, 4).map((friend) => (
                    <li key={friend.username}>
                        <Link href={`/u/${friend.username}`} className={styles.quickGame}>
                            <span className={styles.friendAvatar}>
                                <Avatar user={friend} size={28} />
                                <PresenceDot status={friend.status} className={styles.friendDot} />
                            </span>
                            <span className={styles.profileText}>
                                <span className={styles.quickTitle}>{friend.displayName}</span>
                                <span className={styles.friendStatus}>{presenceLabel(friend.status)}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}

// The status friends see (online, away or invisible): a dot on the corner of your avatar that opens a
// menu to change it. It sits beside the profile link rather than inside it (a button can't go in a link).
function StatusMenu() {
    const { user, status, setStatus } = useStore()
    const presence = usePresence()(user.username, Date.now())
    return (
        <Menu
            label={`Status: ${presenceLabel(presence)}. Change status`}
            className={styles.statusAnchor}
            buttonClassName={styles.statusButton}
            items={[
                { heading: 'Show me as' },
                ...Object.entries(STATUSES).map(([id, s]) => ({ label: s.label, checked: status === id, onSelect: () => setStatus(id) })),
            ]}
        >
            <PresenceDot status={presence} className={styles.statusDot} />
        </Menu>
    )
}

// Only rendered after hydration, so it can check the system setting directly.
function ThemeToggle() {
    const { prefs, updatePrefs } = useStore()
    const dark = prefs.theme === 'system' ? !window.matchMedia('(prefers-color-scheme: light)').matches : prefs.theme === 'dark'
    const label = dark ? 'Switch to light theme' : 'Switch to dark theme'

    return (
        <button type="button" className={styles.iconButton} onClick={() => updatePrefs({ theme: dark ? 'light' : 'dark' })} aria-label={label} title={label}>
            {dark ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
        </button>
    )
}

export default function Sidebar(){
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    // The link that was just clicked: highlighted immediately, before the new page has loaded
    const [pendingHref, setPendingHref] = useState(null)
    const { hydrated, user, library, wishlist, cart, friends, wallet, playing, play, formatMoney } = useStore()
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
    const profileHref = user ? `/u/${user.username}` : null
    const isActive = (href) => (href === '/' ? current === '/' : current.startsWith(href))
    const onNavigate = (href) => href !== pathname && setPendingHref(href)
    const link = (href) => ({ href, active: isActive(href), onNavigate })
    const counts = hydrated ? { library: library.length, wishlist: wishlist.length, cart: cart.length, friends: friends.length } : {}

    const quickLaunch = library
        .filter((entry) => entry.installed && !entry.hidden && entry.slug !== playing?.slug && isReleased(getGame(entry.slug)))
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
                <Link href="/" className={styles.brand} aria-label="Ultimate Game Launcher home">
                    <Logo height={34} />
                </Link>
                <div className={styles.topActions}>
                    <Notifications className={styles.iconButton} />
                    <Link href="/cart" className={styles.iconButton} aria-label={`Cart${counts.cart ? ` (${counts.cart})` : ''}`}>
                        <ShoppingCartOutlinedIcon />
                        {counts.cart > 0 && <span className={styles.badge} aria-hidden="true">{counts.cart}</span>}
                    </Link>
                </div>
            </header>

            <div className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

            <aside id="sidebar" className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Sidebar">
                <div className={styles.header}>
                    <Link href="/" className={styles.brand} aria-label="Ultimate Game Launcher home">
                        <Logo height={44} priority />
                    </Link>
                    <div className={styles.desktopOnly}>
                        <Notifications className={styles.iconButton} />
                    </div>
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

                <SearchBox onNavigate={onNavigate} />

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
                        <NavLink {...link('/library')} icon={VideogameAssetOutlinedIcon} label="Library" count={counts.library} countLabel="games" />
                        <DownloadsNavLink {...link('/downloads')} icon={DownloadIcon} label="Downloads" />
                        <NavLink {...link('/wishlist')} icon={FavoriteBorderIcon} label="Wishlist" count={counts.wishlist} countLabel="games" />
                        <NavLink {...link('/cart')} icon={ShoppingCartOutlinedIcon} label="Cart" count={counts.cart} />
                        <NavLink {...link('/friends')} icon={PeopleOutlineIcon} label="Friends" count={counts.friends} countLabel="friends" />
                    </ul>
                </nav>

                {hydrated && <NowPlaying />}
                <DownloadsPanel />
                {hydrated && user && <FriendsPanel />}

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
                    <div className={styles.footerRow}>
                        <ul>
                            <NavLink {...link('/about')} icon={InfoOutlinedIcon} label="About" />
                        </ul>
                        {hydrated && <ThemeToggle />}
                    </div>

                    {/* The launcher only opens once someone is logged in (see AuthGate) */}
                    {user && (
                        <div className={styles.profile}>
                            <Link
                                href={profileHref}
                                className={`${styles.profileLink} ${isActive(profileHref) ? styles.profileActive : ''}`}
                                aria-label={`${user.displayName}, view your profile`}
                                aria-current={isActive(profileHref) ? 'page' : undefined}
                                onClick={() => onNavigate(profileHref)}
                            >
                                <Avatar user={user} size={32} />
                                <span className={styles.profileText}>
                                    <span className={styles.name}>{user.displayName}</span>
                                    <span className={styles.username}>Wallet {formatMoney(wallet.balance)}</span>
                                </span>
                            </Link>
                            {hydrated && <StatusMenu />}
                            <Link
                                href="/settings"
                                className={`${styles.iconButton} ${isActive('/settings') ? styles.iconActive : ''}`}
                                aria-label="Settings"
                                title="Settings"
                                aria-current={isActive('/settings') ? 'page' : undefined}
                                onClick={() => onNavigate('/settings')}
                            >
                                <SettingsOutlinedIcon fontSize="small" />
                            </Link>
                            <Link href="/signout" className={styles.iconButton} aria-label="Sign out" title="Sign out" onClick={() => onNavigate('/signout')}>
                                <LogoutIcon fontSize="small" />
                            </Link>
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
}
