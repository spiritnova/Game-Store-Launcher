'use client'

import Image from 'next/image'
import Link from 'next/link'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import CloseIcon from '@mui/icons-material/Close'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ScheduleIcon from '@mui/icons-material/Schedule'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import { cardImage, formatSize, getGame } from '@/lib/games'
import { placeholderColor } from '@/lib/image-colors'
import { formatEta, formatSpeed, statusLabel, useDownloads } from '@/lib/downloads'
import { AUTO_UPDATE_MODES, BANDWIDTH_LIMITS, CONNECTIONS, driveUsage, formatRelative, useStore } from '@/lib/store'
import Button from '../UI/Button'
import ProgressBar from '../UI/ProgressBar'
import SignInPrompt from '../UI/SignInPrompt'
import Skeleton from '../UI/Skeleton'
import styles from './DownloadsView.module.css'

const QUEUED = { install: 'Install', update: 'Update', repair: 'Repair' }
const FINISHED = { install: 'Installed', update: 'Updated', repair: 'Repaired' }

function SpeedGraph({ samples, max }) {
    const width = 300
    const height = 64
    if (samples.length < 2) return <div className={styles.graph} />
    const points = samples.map((s, i) => [(i / (60 - 1)) * width, height - (Math.min(s, max) / max) * (height - 4)])
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
    const { current, running, queue, history, samples, speed, schedule, region, updates } = downloads
    const connection = CONNECTIONS[settings.connection]
    const limit = BANDWIDTH_LIMITS[settings.bandwidthLimit]
    const bits = settings.showBits
    const status = current ? downloads.statusOf(current.slug) : null
    const upNext = queue.slice(1)

    const header = (
        <header className={styles.header}>
            <h1>Downloads</h1>
            {hydrated && session && (
                <p>
                    {current
                        ? `${status ? statusLabel(status) : ''} ${getGame(current.slug).title}`
                        : 'Nothing downloading'}
                    {upNext.length > 0 && ` · ${upNext.length} in queue`}
                </p>
            )}
        </header>
    )

    if (!hydrated || !downloads.hydrated) {
        return <>{header}<Skeleton height="220px" radius="16px" /></>
    }

    if (!session) {
        return (
            <>
                {header}
                <SignInPrompt title="Sign in to see your downloads" text="Install games from your library and track them here." next="/downloads" />
            </>
        )
    }

    const game = current && getGame(current.slug)
    const drives = driveUsage(library)
    const peak = samples.length ? Math.max(...samples) : 0
    const remaining = current ? current.sizeGB - current.downloadedGB : 0
    const autoUpdate = AUTO_UPDATE_MODES[settings.autoUpdate]

    return (
        <>
            {header}

            {schedule.blocked && (
                <div className={styles.notice} role="status">
                    <ScheduleIcon />
                    <p>
                        Downloads are scheduled for <strong>{schedule.window.start}–{schedule.window.end}</strong>. The next window opens in{' '}
                        {formatEta(schedule.startsInSeconds)}.
                    </p>
                    <Button variant="ghost" size="small" onClick={downloads.startNow}>Download now</Button>
                </div>
            )}

            {game ? (
                <section className={styles.current} aria-labelledby="current-title">
                    <Thumb game={game} wide />
                    <div className={styles.currentBody}>
                        <div className={styles.currentTop}>
                            <div>
                                <p className={`${styles.eyebrow} ${status.status === 'paused' ? styles.eyebrowPaused : ''}`}>
                                    {statusLabel(status)}
                                </p>
                                <h2 id="current-title">{game.title}</h2>
                            </div>
                            <div className={styles.controls}>
                                {status.status === 'paused' ? (
                                    <Button size="small" onClick={() => downloads.resume(game.slug)}>
                                        <PlayArrowIcon fontSize="small" /> Resume
                                    </Button>
                                ) : status.status === 'scheduled' ? null : (
                                    <Button variant="ghost" size="small" onClick={() => downloads.pause(game.slug)}>
                                        <PauseIcon fontSize="small" /> Pause
                                    </Button>
                                )}
                                <Button variant="ghost" size="small" onClick={() => downloads.cancel(game.slug)} aria-label={`Cancel ${game.title} download`}>
                                    <CloseIcon fontSize="small" />
                                </Button>
                            </div>
                        </div>

                        <ProgressBar value={status.progress} label={`${statusLabel(status)} ${game.title}`} />

                        <dl className={styles.stats}>
                            <div>
                                <dt>Downloaded</dt>
                                <dd>{formatSize(current.downloadedGB)} of {formatSize(current.sizeGB)}</dd>
                            </div>
                            <div>
                                <dt>Speed</dt>
                                <dd>{running ? formatSpeed(speed, bits) : status.status === 'paused' ? 'Paused' : '—'}</dd>
                            </div>
                            <div>
                                <dt>Peak</dt>
                                <dd>{formatSpeed(peak, bits)}</dd>
                            </div>
                            <div>
                                <dt>Time left</dt>
                                <dd>{running && speed ? formatEta(remaining / speed) : '—'}</dd>
                            </div>
                        </dl>

                        <div className={styles.graphWrap}>
                            <SpeedGraph samples={samples} max={Math.max(connection.max * region.speed, peak) * 1.1} />
                            <p className={styles.connection}>
                                {region.label.replace(' (recommended)', '')} · {connection.label}
                                {limit.gbps && <> · limited to {limit.label}</>} · <Link href="/settings#downloads">Change</Link>
                            </p>
                        </div>
                    </div>
                </section>
            ) : (
                <div className={styles.idle}>
                    <p>No downloads in progress.</p>
                    <Button href="/library" variant="ghost" size="small">Go to library</Button>
                </div>
            )}

            <div className={styles.columns}>
                <div>
                    <section aria-labelledby="queue-title">
                        <h2 id="queue-title" className={styles.sectionTitle}>Up next <span>{upNext.length}</span></h2>
                        {upNext.length === 0 ? (
                            <p className={styles.empty}>The queue is empty. Use Install in your library to add games.</p>
                        ) : (
                            <ul className={styles.list}>
                                {upNext.map((item, index) => {
                                    const queued = getGame(item.slug)
                                    return (
                                        <li key={item.slug} className={styles.row}>
                                            <Thumb game={queued} />
                                            <div className={styles.rowBody}>
                                                <p className={styles.rowTitle}>{queued.title}</p>
                                                <p className={styles.rowMeta}>
                                                    {QUEUED[item.kind]} · {formatSize(item.sizeGB)}
                                                    {item.downloadedGB > 0 && ` · ${Math.floor((item.downloadedGB / item.sizeGB) * 100)}% done`}
                                                </p>
                                            </div>
                                            <div className={styles.rowActions}>
                                                {index > 0 && (
                                                    <button type="button" onClick={() => downloads.moveUp(item.slug)} aria-label={`Move ${queued.title} up`} title="Move up">
                                                        <ArrowUpwardIcon fontSize="small" />
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => downloads.resume(item.slug)} aria-label={`Download ${queued.title} now`} title="Download now">
                                                    <PlayArrowIcon fontSize="small" />
                                                </button>
                                                <button type="button" onClick={() => downloads.cancel(item.slug)} aria-label={`Remove ${queued.title} from queue`} title="Remove">
                                                    <CloseIcon fontSize="small" />
                                                </button>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </section>

                    <section aria-labelledby="updates-title" className={styles.block}>
                        <h2 id="updates-title" className={styles.sectionTitle}>
                            Updates available <span>{updates.length}</span>
                            {updates.length > 1 && (
                                <button type="button" className={styles.clear} onClick={downloads.updateAll}>Update all</button>
                            )}
                        </h2>
                        {updates.length === 0 ? (
                            <p className={styles.empty}>All your installed games are up to date.</p>
                        ) : (
                            <ul className={styles.list}>
                                {updates.map((update) => {
                                    const updatable = getGame(update.slug)
                                    return (
                                        <li key={update.slug} className={styles.row}>
                                            <Thumb game={updatable} />
                                            <div className={styles.rowBody}>
                                                <p className={styles.rowTitle}>{updatable.title}</p>
                                                <p className={styles.rowMeta}>Version {update.version} · {formatSize(update.sizeGB)}</p>
                                                <details className={styles.notes}>
                                                    <summary>What’s new</summary>
                                                    <ul>
                                                        {update.notes.map((note) => <li key={note}>{note}</li>)}
                                                    </ul>
                                                </details>
                                            </div>
                                            <Button variant="ghost" size="small" onClick={() => downloads.queueUpdate(update.slug)}>
                                                <SystemUpdateAltIcon fontSize="small" /> Update
                                            </Button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                        <p className={styles.hint}>
                            Auto-update: <strong>{autoUpdate.label}</strong> · <Link href="/settings#downloads">Change</Link>
                        </p>
                    </section>

                    <section aria-labelledby="history-title" className={styles.block}>
                        <h2 id="history-title" className={styles.sectionTitle}>
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
                                    const finished = getGame(item.slug)
                                    const installed = library.some((e) => e.slug === item.slug && e.installed)
                                    return (
                                        <li key={`${item.slug}-${item.finishedAt}`} className={styles.row}>
                                            <Thumb game={finished} />
                                            <div className={styles.rowBody}>
                                                <p className={styles.rowTitle}>{finished.title}</p>
                                                <p className={styles.rowMeta}>
                                                    {FINISHED[item.kind]} · {formatSize(item.sizeGB)} · {formatRelative(item.finishedAt)}
                                                </p>
                                            </div>
                                            {installed && (
                                                <Button variant="success" size="small" onClick={() => play(finished)}>
                                                    <PlayArrowIcon fontSize="small" /> Play
                                                </Button>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </section>
                </div>

                <aside className={styles.disk} aria-labelledby="disk-title">
                    <h2 id="disk-title" className={styles.sectionTitle}>Storage</h2>
                    {drives.map((drive) => (
                        <div key={drive.id} className={styles.drive}>
                            <p className={styles.diskLabel}>
                                {drive.label}
                                {drive.id === settings.installDrive && <span className={styles.defaultDrive}>Default</span>}
                            </p>
                            <div className={styles.diskBar} aria-hidden="true">
                                <span style={{ width: `${drive.percent}%` }} />
                            </div>
                            <p className={styles.diskMeta}>
                                {formatSize(drive.gamesGB)} of games · {formatSize(drive.freeGB)} free of {formatSize(drive.capacityGB)}
                            </p>
                        </div>
                    ))}
                    <dl className={styles.diskStats}>
                        <div>
                            <dt>Region</dt>
                            <dd>{region.label.replace(' (recommended)', '')}</dd>
                        </div>
                        <div>
                            <dt>Schedule</dt>
                            <dd>{schedule.enabled ? `${schedule.window.start}–${schedule.window.end}` : 'Any time'}</dd>
                        </div>
                    </dl>
                    <Button href="/settings#downloads" variant="ghost" size="small">Download settings</Button>
                </aside>
            </div>
        </>
    )
}
