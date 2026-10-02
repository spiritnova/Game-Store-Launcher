'use client'

import { useState } from 'react'
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import DownloadIcon from '@mui/icons-material/Download'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import StopIcon from '@mui/icons-material/Stop'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import { formatSize } from '@/lib/games'
import { statusLabel, useDownloads } from '@/lib/downloads'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import Skeleton from '../UI/Skeleton'
import WishlistButton from '../UI/WishlistButton'
import ProgressBar from '../UI/ProgressBar'
import GameMenu from '../Library/GameMenu'
import GiftDialog from './GiftDialog'
import styles from './GameActions.module.css'

// "Buy as a gift" and, for games you own, the manage menu. Only on the game page (stacked layout).
function SecondaryActions({ game, owned }) {
    const { session } = useStore()
    const [gifting, setGifting] = useState(false)
    const canGift = Boolean(session) && game.price > 0
    if (!canGift && !owned) return null

    return (
        <div className={styles.secondary}>
            {canGift && (
                <>
                    <Button variant="ghost" onClick={() => setGifting(true)} className={styles.giftButton}>
                        <CardGiftcardIcon fontSize="small" /> Buy as a gift
                    </Button>
                    <GiftDialog game={game} open={gifting} onClose={() => setGifting(false)} />
                </>
            )}
            {owned && <GameMenu game={game} className={styles.menuButton} />}
        </div>
    )
}

// Cart / install / play controls that follow the game's state for the signed-in user.
// `detailsHref` adds a link to the game page (used in the home carousel).
export default function GameActions({ game, detailsHref, stacked = false }) {
    const { hydrated, getEntry, cartItemFor, addToCart, play, playing, stopPlaying } = useStore()
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
    // Keyed so it stays mounted (with any open dialog) as the buttons around it change, e.g. when a download starts
    const secondary = stacked && <SecondaryActions key="secondary" game={game} owned={Boolean(entry)} />

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
                {secondary}
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
                {secondary}
            </div>
        )
    }

    const update = downloads.updateFor(game.slug)
    const isPlaying = playing?.slug === game.slug

    return (
        <div className={className}>
            {!entry.installed ? (
                <Button variant="success" size="large" onClick={() => downloads.install(game)}>
                    <DownloadIcon /> Install
                </Button>
            ) : isPlaying ? (
                <Button variant="secondary" size="large" onClick={stopPlaying}>
                    <StopIcon /> Stop playing
                </Button>
            ) : (
                <Button variant="success" size="large" onClick={() => play(game)}>
                    <PlayArrowIcon /> Play
                </Button>
            )}
            {update && (
                <Button variant="secondary" size="large" onClick={() => downloads.queueUpdate(game.slug)}>
                    <SystemUpdateAltIcon fontSize="small" /> Update · {formatSize(update.sizeGB)}
                </Button>
            )}
            {details ?? <Button href="/library" variant="ghost" size="large">In your library</Button>}
            {secondary}
        </div>
    )
}
