'use client'

import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import DownloadIcon from '@mui/icons-material/Download'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import { formatSize } from '@/lib/games'
import { statusLabel, useDownloads } from '@/lib/downloads'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import Skeleton from '../UI/Skeleton'
import WishlistButton from '../UI/WishlistButton'
import ProgressBar from '../UI/ProgressBar'
import styles from './GameActions.module.css'

// Cart / install / play controls that follow the game's state for the signed-in user.
// `detailsHref` adds a link to the game page (used in the home carousel).
export default function GameActions({ game, detailsHref, stacked = false }) {
    const { hydrated, getEntry, cartItemFor, addToCart, play } = useStore()
    const downloads = useDownloads()
    const className = `${styles.actions} ${stacked ? styles.stacked : ''}`

    if (!hydrated) {
        return (
            <div className={className}>
                <Skeleton width="180px" height="46px" />
            </div>
        )
    }

    const entry = getEntry(game.slug)
    const details = detailsHref && <Button href={detailsHref} variant="ghost" size="large">View details</Button>

    if (!entry) {
        return (
            <div className={className}>
                {cartItemFor(game.slug) ? (
                    <Button href="/cart" variant="secondary" size="large">
                        <ShoppingCartIcon fontSize="small" /> In cart
                    </Button>
                ) : (
                    <Button size="large" onClick={() => addToCart(game)}>
                        <AddShoppingCartIcon fontSize="small" /> {game.price === 0 ? 'Get for free' : 'Add to cart'}
                    </Button>
                )}
                {details ?? <WishlistButton game={game} variant="full" />}
            </div>
        )
    }

    const download = downloads.statusOf(game.slug)

    if (download) {
        const label = statusLabel(download)
        return (
            <div className={className}>
                <div className={styles.installing}>
                    <span className={`${styles.status} ${download.status === 'paused' ? styles.paused : ''}`}>{label}</span>
                    <ProgressBar value={download.progress} label={`${label} ${game.title}`} />
                    {download.status === 'downloading' && (
                        <Button variant="ghost" size="small" onClick={() => downloads.pause(game.slug)} aria-label={`Pause ${game.title}`}>
                            <PauseIcon fontSize="small" />
                        </Button>
                    )}
                    {download.status === 'paused' && (
                        <Button size="small" onClick={() => downloads.resume(game.slug)}>Resume</Button>
                    )}
                    {(download.status === 'queued' || download.status === 'scheduled') && (
                        <Button variant="ghost" size="small" onClick={() => (download.status === 'queued' ? downloads.resume(game.slug) : downloads.startNow())}>
                            Start now
                        </Button>
                    )}
                </div>
                {details ?? <Button href="/downloads" variant="ghost" size="large">View downloads</Button>}
            </div>
        )
    }

    const update = downloads.updateFor(game.slug)

    return (
        <div className={className}>
            {entry.installed ? (
                <Button variant="success" size="large" onClick={() => play(game)}>
                    <PlayArrowIcon /> Play
                </Button>
            ) : (
                <Button variant="success" size="large" onClick={() => downloads.install(game)}>
                    <DownloadIcon /> Install
                </Button>
            )}
            {update && (
                <Button variant="secondary" size="large" onClick={() => downloads.queueUpdate(game.slug)}>
                    <SystemUpdateAltIcon fontSize="small" /> Update · {formatSize(update.sizeGB)}
                </Button>
            )}
            {details ?? <Button href="/library" variant="ghost" size="large">In your library</Button>}
        </div>
    )
}
