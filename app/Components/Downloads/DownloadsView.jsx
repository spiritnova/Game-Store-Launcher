'use client'

import Image from 'next/image'
import Link from 'next/link'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import CloseIcon from '@mui/icons-material/Close'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { cardImage, formatSize, getGame } from '@/lib/games'
import { placeholderColor } from '@/lib/image-colors'
import { formatEta, formatSpeed, useDownloads } from '@/lib/downloads'
import { CONNECTIONS, formatRelative, useStore } from '@/lib/store'
import Button from '../UI/Button'
import ProgressBar from '../UI/ProgressBar'
import SignInPrompt from '../UI/SignInPrompt'
import Skeleton from '../UI/Skeleton'
import styles from './DownloadsView.module.css'

const DRIVE_GB = 2000

function SpeedGraph({ samples, max }) {
    const width = 300
    const height = 64
    if (samples.length < 2) return <div className={styles.graph} />
    const points = samples.map((s, i) => [
        (i / (60 - 1)) * width,
        height - (s / max) * (height - 4),
    ])
    const offset = width - points.at(-1)[0]
    const line = points.map(([x, y]) => `${(x + offset).toFixed(1)},${y.toFixed(1)}`).join(' ')
    const area = `${(points[0][0] + offset).toFixed(1)},${height} ${line} ${width},${height}`

    return (
        <svg className={styles.graph} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <polygon points={area} className={styles.graphArea} />
            <polyline points={line} className={styles.graphLine} />
        </svg>
    )
}

function Thumb({ game, wide }) {
    const src = wide ? game.banner : cardImage(game)
    return (
        <div className={wide ? styles.wideThumb : styles.thumb} style={{ backgroundColor: placeholderColor(src) }}>
            <Image src={src} alt="" fill sizes={wide ? '(max-width: 900px) 100vw, 50vw' : '48px'} />
        </div>
    )
}

export default function DownloadsView() {
    const { hydrated, session, settings, library, play } = useStore()
    const downloads = useDownloads()
    const { active, queue, history, samples, speed } = downloads
    const connection = CONNECTIONS[settings.connection]

    const header = (
        <header className={styles.header}>
            <h1>Downloads</h1>
            {hydrated && session && (
                <p>
                    {active ? `Downloading ${getGame(active.slug).title}` : 'Nothing downloading'}
                    {queue.length > (active ? 1 : 0) && ` · ${queue.length - (active ? 1 : 0)} in queue`}
                </p>
            )}
        </header>
    )

    if (!hydrated || !downloads.hydrated) {
        return <>{header}<Skeleton height="220px" radius="8px" /></>
    }

    if (!session) {
        return (
            <>
                {header}
                <SignInPrompt title="Sign in to see your downloads" text="Install games from your library and track them here." next="/downloads" />
            </>
        )
    }

    const activeGame = active && getGame(active.slug)
    const upNext = queue.filter((item) => item !== active)
    const installedGB = library.filter((e) => e.installed).reduce((sum, e) => sum + (getGame(e.slug).sizeGB ?? 0), 0)
    const peak = samples.length ? Math.max(...samples) : 0

    return (
        <>
            {header}

            {activeGame ? (
                <section className={styles.current} aria-labelledby="current-title">
                    <Thumb game={activeGame} wide />
                    <div className={styles.currentBody}>
                        <div className={styles.currentTop}>
                            <div>
                                <p className={styles.eyebrow}>Downloading</p>
                                <h2 id="current-title">{activeGame.title}</h2>
                            </div>
                            <div className={styles.controls}>
                                <Button variant="ghost" size="small" onClick={() => downloads.pause(activeGame.slug)}>
                                    <PauseIcon fontSize="small" /> Pause
                                </Button>
                                <Button variant="ghost" size="small" onClick={() => downloads.cancel(activeGame.slug)} aria-label={`Cancel ${activeGame.title} download`}>
                                    <CloseIcon fontSize="small" />
                                </Button>
                            </div>
                        </div>

                        <ProgressBar value={(active.downloadedGB / activeGame.sizeGB) * 100} label={`Downloading ${activeGame.title}`} />

                        <dl className={styles.stats}>
                            <div>
                                <dt>Downloaded</dt>
                                <dd>{formatSize(active.downloadedGB)} of {formatSize(activeGame.sizeGB)}</dd>
                            </div>
                            <div>
                                <dt>Speed</dt>
                                <dd>{formatSpeed(speed)}</dd>
                            </div>
                            <div>
                                <dt>Peak</dt>
                                <dd>{formatSpeed(peak)}</dd>
                            </div>
                            <div>
                                <dt>Time left</dt>
                                <dd>{speed ? formatEta((activeGame.sizeGB - active.downloadedGB) / speed) : '—'}</dd>
                            </div>
                        </dl>

                        <div className={styles.graphWrap}>
                            <SpeedGraph samples={samples} max={connection.max * 1.1} />
                            <p className={styles.connection}>
                                Simulated connection: <strong>{connection.label}</strong> · <Link href="/settings#downloads">Change</Link>
                            </p>
                        </div>
                    </div>
                </section>
            ) : (
                <div className={styles.idle}>
                    <p>{upNext.length ? 'Your downloads are paused.' : 'No downloads in progress.'}</p>
                    <Button href="/library" variant="ghost" size="small">Go to library</Button>
                </div>
            )}

            <div className={styles.columns}>
                <section aria-labelledby="queue-title">
                    <h2 id="queue-title" className={styles.sectionTitle}>Up next <span>{upNext.length}</span></h2>
                    {upNext.length === 0 ? (
                        <p className={styles.empty}>The queue is empty. Use Install in your library to add games.</p>
                    ) : (
                        <ul className={styles.list}>
                            {upNext.map((item, index) => {
                                const game = getGame(item.slug)
                                const progress = (item.downloadedGB / game.sizeGB) * 100
                                return (
                                    <li key={item.slug} className={styles.row}>
                                        <Thumb game={game} />
                                        <div className={styles.rowBody}>
                                            <p className={styles.rowTitle}>{game.title}</p>
                                            <p className={styles.rowMeta}>
                                                {item.paused ? 'Paused' : 'Queued'} · {formatSize(game.sizeGB)}
                                                {progress > 0 && ` · ${Math.floor(progress)}% done`}
                                            </p>
                                        </div>
                                        <div className={styles.rowActions}>
                                            {index > 0 && (
                                                <button type="button" onClick={() => downloads.moveUp(item.slug)} aria-label={`Move ${game.title} up`} title="Move up">
                                                    <ArrowUpwardIcon fontSize="small" />
                                                </button>
                                            )}
                                            <button type="button" onClick={() => downloads.prioritize(item.slug)} aria-label={`Download ${game.title} now`} title="Download now">
                                                <PlayArrowIcon fontSize="small" />
                                            </button>
                                            {!item.paused && (
                                                <button type="button" onClick={() => downloads.pause(item.slug)} aria-label={`Pause ${game.title}`} title="Pause">
                                                    <PauseIcon fontSize="small" />
                                                </button>
                                            )}
                                            <button type="button" onClick={() => downloads.cancel(item.slug)} aria-label={`Remove ${game.title} from queue`} title="Remove">
                                                <CloseIcon fontSize="small" />
                                            </button>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    <h2 className={styles.sectionTitle}>
                        Recently finished <span>{history.length}</span>
                        {history.length > 0 && (
                            <button type="button" className={styles.clear} onClick={downloads.clearHistory}>Clear</button>
                        )}
                    </h2>
                    {history.length === 0 ? (
                        <p className={styles.empty}>Finished downloads show up here.</p>
                    ) : (
                        <ul className={styles.list}>
                            {history.map((item) => {
                                const game = getGame(item.slug)
                                const installed = library.some((e) => e.slug === item.slug && e.installed)
                                return (
                                    <li key={`${item.slug}-${item.finishedAt}`} className={styles.row}>
                                        <Thumb game={game} />
                                        <div className={styles.rowBody}>
                                            <p className={styles.rowTitle}>{game.title}</p>
                                            <p className={styles.rowMeta}>{formatSize(item.sizeGB)} · finished {formatRelative(item.finishedAt)}</p>
                                        </div>
                                        {installed && (
                                            <Button variant="secondary" size="small" onClick={() => play(game)}>
                                                <PlayArrowIcon fontSize="small" /> Play
                                            </Button>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </section>

                <aside className={styles.disk} aria-labelledby="disk-title">
                    <h2 id="disk-title" className={styles.sectionTitle}>Storage</h2>
                    <p className={styles.diskLabel}>Local disk (C:) · simulated</p>
                    <div className={styles.diskBar} aria-hidden="true">
                        <span style={{ width: `${Math.min(100, (installedGB / DRIVE_GB) * 100)}%` }} />
                    </div>
                    <dl className={styles.diskStats}>
                        <div>
                            <dt>Installed games</dt>
                            <dd>{formatSize(installedGB)}</dd>
                        </div>
                        <div>
                            <dt>Free space</dt>
                            <dd>{formatSize(DRIVE_GB - installedGB)}</dd>
                        </div>
                        <div>
                            <dt>Connection</dt>
                            <dd>{connection.label}</dd>
                        </div>
                    </dl>
                    <Button href="/settings#downloads" variant="ghost" size="small">Download settings</Button>
                </aside>
            </div>
        </>
    )
}
