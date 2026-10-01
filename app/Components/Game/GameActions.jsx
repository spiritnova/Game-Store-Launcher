'use client'

import DownloadIcon from '@mui/icons-material/Download'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { currentPrice, formatPrice } from '@/lib/games'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import Skeleton from '../UI/Skeleton'
import WishlistButton from '../UI/WishlistButton'
import ProgressBar from '../UI/ProgressBar'
import styles from './GameActions.module.css'

// Buy / install / play controls that follow the game's state in the library.
// `detailsHref` adds a link to the game page (used in the home carousel).
export default function GameActions({ game, detailsHref, stacked = false }) {
    const { hydrated, getEntry, downloads, buy, install, cancelInstall, play } = useStore()
    const className = `${styles.actions} ${stacked ? styles.stacked : ''}`

    if (!hydrated) {
        return (
            <div className={className}>
                <Skeleton width="180px" height="46px" />
            </div>
        )
    }

    const entry = getEntry(game.slug)
    const progress = downloads[game.slug]
    const details = detailsHref && <Button href={detailsHref} variant="ghost" size="large">View details</Button>

    if (!entry) {
        return (
            <div className={className}>
                <Button size="large" onClick={() => buy(game)} aria-label={`Buy ${game.title} for ${formatPrice(currentPrice(game))}`}>
                    Buy now
                </Button>
                {details ?? <WishlistButton game={game} variant="full" />}
            </div>
        )
    }

    if (progress !== undefined) {
        return (
            <div className={className}>
                <div className={styles.installing}>
                    <ProgressBar value={progress} label={`Installing ${game.title}`} />
                    <Button variant="ghost" size="small" onClick={() => cancelInstall(game)}>Cancel</Button>
                </div>
                {details}
            </div>
        )
    }

    return (
        <div className={className}>
            {entry.installed ? (
                <Button variant="secondary" size="large" onClick={() => play(game)}>
                    <PlayArrowIcon /> Play
                </Button>
            ) : (
                <Button variant="secondary" size="large" onClick={() => install(game)}>
                    <DownloadIcon /> Install
                </Button>
            )}
            {details ?? <Button href="/library" variant="ghost" size="large">In your library</Button>}
        </div>
    )
}
