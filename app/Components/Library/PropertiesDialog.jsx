'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatSize, getEdition } from '@/lib/games'
import { useDownloads } from '@/lib/downloads'
import { DRIVES, driveUsage, formatDateTime, formatPlaytime, useStore } from '@/lib/store'
import Button from '../UI/Button'
import Dialog from '../UI/Dialog'
import ProgressBar from '../UI/ProgressBar'
import Select from '../UI/Select'
import styles from './PropertiesDialog.module.css'

const tabs = [
    { id: 'general', label: 'General' },
    { id: 'files', label: 'Installed files' },
    { id: 'purchase', label: 'Purchase' },
]

// A simulated task (verifying or moving files) that fills a progress bar over `ms`, then calls `onDone`.
function useTask(ms, onDone) {
    const [progress, setProgress] = useState(null)
    const done = useRef(onDone)
    done.current = onDone

    useEffect(() => {
        if (progress === null || progress >= 100) return
        const timer = setTimeout(() => {
            const next = Math.min(100, progress + 100 / (ms / 100))
            setProgress(next)
            if (next >= 100) done.current()
        }, 100)
        return () => clearTimeout(timer)
    }, [progress, ms])

    return { progress, running: progress !== null && progress < 100, start: () => setProgress(0), reset: () => setProgress(null) }
}

function GeneralTab({ game, entry }) {
    const { setLaunchOptions } = useStore()
    const [options, setOptions] = useState(entry.launchOptions ?? '')
    const saved = options === (entry.launchOptions ?? '')

    return (
        <form
            className={styles.section}
            onSubmit={(e) => {
                e.preventDefault()
                setLaunchOptions(game.slug, options.trim())
            }}
        >
            <div className={styles.field}>
                <label htmlFor="launch-options">Launch options</label>
                <input
                    id="launch-options"
                    value={options}
                    onChange={(e) => setOptions(e.target.value)}
                    placeholder="e.g. -fullscreen -novid"
                    spellCheck={false}
                    autoComplete="off"
                    aria-describedby="launch-options-help"
                />
                <p id="launch-options-help" className={styles.muted}>Passed to the game when it starts. For advanced players.</p>
            </div>
            <div className={styles.actions}>
                <Button type="submit" variant="secondary" size="small" disabled={saved}>{saved ? 'Saved' : 'Save'}</Button>
            </div>
            <dl className={styles.facts}>
                <div><dt>Playtime</dt><dd>{formatPlaytime(entry.playtimeMinutes)}</dd></div>
                <div><dt>Last played</dt><dd>{entry.lastPlayed ? formatDateTime(entry.lastPlayed) : 'Never'}</dd></div>
                <div><dt>Edition</dt><dd>{getEdition(game, entry.edition).name}</dd></div>
            </dl>
        </form>
    )
}

function FilesTab({ game, entry }) {
    const { library, settings, moveInstall } = useStore()
    const downloads = useDownloads()
    const [result, setResult] = useState(null)
    const drives = driveUsage(library)
    const otherDrives = drives.filter((d) => d.id !== entry.drive)
    const [target, setTarget] = useState(otherDrives[0]?.id)
    const targetDrive = drives.find((d) => d.id === target)
    const fits = targetDrive && targetDrive.freeGB >= game.sizeGB
    const busy = Boolean(downloads.statusOf(game.slug))

    const verify = useTask(2500, () => {
        // Now and then a file or two fails the check and gets downloaded again
        const failed = Math.random() < 0.35 ? 1 + Math.floor(Math.random() * 3) : 0
        if (failed) downloads.repair(game.slug, Math.round((0.05 + Math.random() * 0.4) * 100) / 100)
        setResult(failed ? `${failed} ${failed === 1 ? 'file' : 'files'} failed to validate and will be downloaded again.` : 'All files were validated successfully.')
    })
    const move = useTask(2200, () => {
        moveInstall(game.slug, target)
        setResult(null)
    })

    if (!entry.installed) {
        return (
            <div className={styles.section}>
                <p className={styles.muted}>
                    {game.title} isn’t installed. It will be installed to your default drive, {DRIVES[settings.installDrive]?.label ?? DRIVES.c.label}.{' '}
                    <Link href="/settings#downloads">Change default drive</Link>
                </p>
            </div>
        )
    }

    const drive = DRIVES[entry.drive] ?? DRIVES.c
    return (
        <div className={styles.section}>
            <dl className={styles.facts}>
                <div><dt>Location</dt><dd className={styles.path}>{drive.path}\{game.slug}</dd></div>
                <div><dt>Size on disk</dt><dd>{formatSize(game.sizeGB)}</dd></div>
                <div><dt>Drive</dt><dd>{drive.label}</dd></div>
            </dl>

            <div className={styles.block}>
                <h3>Verify integrity of game files</h3>
                <p className={styles.muted}>Checks every file and downloads any that are missing or damaged.</p>
                {verify.progress !== null && <ProgressBar value={verify.progress} label={`Verifying ${game.title}`} />}
                {result && !verify.running && <p className={styles.result} role="status">{result}</p>}
                <div className={styles.actions}>
                    <Button variant="secondary" size="small" disabled={verify.running || move.running || busy} onClick={() => { setResult(null); verify.start() }}>
                        {verify.running ? `Verifying… ${Math.floor(verify.progress)}%` : 'Verify files'}
                    </Button>
                </div>
            </div>

            {otherDrives.length > 0 && (
                <div className={styles.block}>
                    <h3>Move install folder</h3>
                    <div className={styles.field}>
                        <label htmlFor="move-drive" className="visually-hidden">Move to</label>
                        <Select
                            id="move-drive"
                            value={target}
                            onChange={setTarget}
                            options={otherDrives.map((d) => ({ value: d.id, label: `${d.label} · ${formatSize(d.freeGB)} free` }))}
                        />
                    </div>
                    {!fits && <p className={styles.error}>There isn’t enough free space on that drive.</p>}
                    {move.progress !== null && move.running && <ProgressBar value={move.progress} label={`Moving ${game.title}`} />}
                    <div className={styles.actions}>
                        <Button variant="secondary" size="small" disabled={!fits || move.running || verify.running || busy} onClick={move.start}>
                            {move.running ? `Moving… ${Math.floor(move.progress)}%` : `Move to ${targetDrive?.label}`}
                        </Button>
                    </div>
                </div>
            )}
            {busy && <p className={styles.muted}>Wait for the current download to finish before changing files.</p>}
        </div>
    )
}

function PurchaseTab({ game, entry, onRefund }) {
    const { refundInfo, profileOf, formatMoney } = useStore()
    const refund = refundInfo(game.slug)

    return (
        <div className={styles.section}>
            <dl className={styles.facts}>
                <div><dt>Added to library</dt><dd>{formatDateTime(entry.purchasedAt)}</dd></div>
                {entry.giftFrom && <div><dt>Gift from</dt><dd><Link href={`/u/${entry.giftFrom}`}>{profileOf(entry.giftFrom).displayName}</Link></dd></div>}
                {refund?.transaction && (
                    <>
                        <div><dt>Order</dt><dd>{refund.transaction.id}</dd></div>
                        <div><dt>Paid</dt><dd>{formatMoney(refund.amount)}</dd></div>
                    </>
                )}
            </dl>
            <div className={styles.block}>
                <h3>Refund</h3>
                <p className={styles.muted}>
                    {refund?.eligible
                        ? `Eligible until ${formatDateTime(refund.deadline)} while playtime stays under 2 hours.`
                        : `Not eligible: ${refund?.reason ?? 'there is no purchase record.'}`}
                </p>
                <div className={styles.actions}>
                    <Button variant="ghost" size="small" href="/settings#purchases">Purchase history</Button>
                    {refund?.eligible && <Button variant="secondary" size="small" onClick={onRefund}>Request a refund</Button>}
                </div>
            </div>
        </div>
    )
}

export default function PropertiesDialog({ game, open, onClose, onRefund }) {
    const { getEntry } = useStore()
    const [tab, setTab] = useState('general')
    const entry = getEntry(game.slug)

    return (
        <Dialog open={open && Boolean(entry)} onClose={onClose} title={`${game.title} properties`} size="large">
            {entry && (
                <>
                    <div className={styles.tabs} role="tablist" aria-label="Properties">
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                role="tab"
                                id={`props-tab-${t.id}`}
                                aria-selected={tab === t.id}
                                aria-controls="props-panel"
                                onClick={() => setTab(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div id="props-panel" role="tabpanel" aria-labelledby={`props-tab-${tab}`}>
                        {tab === 'general' && <GeneralTab game={game} entry={entry} />}
                        {tab === 'files' && <FilesTab game={game} entry={entry} />}
                        {tab === 'purchase' && <PurchaseTab game={game} entry={entry} onRefund={onRefund} />}
                    </div>
                </>
            )}
        </Dialog>
    )
}
