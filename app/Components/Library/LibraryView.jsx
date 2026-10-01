'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadIcon from '@mui/icons-material/Download'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { cardImage, formatSize, getEdition, getGame } from '@/lib/games'
import { placeholderColor } from '@/lib/image-colors'
import { useDownloads } from '@/lib/downloads'
import { formatLastPlayed, formatPlaytime, useStore } from '@/lib/store'
import Button from '../UI/Button'
import ProgressBar from '../UI/ProgressBar'
import SignInPrompt from '../UI/SignInPrompt'
import { CardGridSkeleton } from '../UI/Skeleton'
import styles from './LibraryView.module.css'

const filters = {
  all: { label: 'All games', test: () => true },
  installed: { label: 'Installed', test: (entry) => entry.installed },
  'not-installed': { label: 'Not installed', test: (entry) => !entry.installed },
}

const sorts = {
  recent: { label: 'Recently played', compare: (a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) },
  title: { label: 'Title A–Z', compare: (a, b) => a.game.title.localeCompare(b.game.title) },
  purchased: { label: 'Recently purchased', compare: (a, b) => b.purchasedAt - a.purchasedAt },
}

function LibraryCard({ entry }) {
  const { uninstall, play } = useStore()
  const downloads = useDownloads()
  const { game } = entry
  const download = downloads.statusOf(game.slug)
  const lastPlayed = formatLastPlayed(entry.lastPlayed)
  const edition = getEdition(game, entry.edition)

  let status = 'Not installed'
  if (download) status = { downloading: 'Downloading…', paused: 'Paused', queued: 'Queued' }[download.status]
  else if (entry.installed) status = 'Installed'

  return (
    <article className={styles.card}>
      <Link
        href={`/games/${game.slug}`}
        className={styles.media}
        tabIndex={-1}
        aria-hidden="true"
        style={{ backgroundColor: placeholderColor(cardImage(game)) }}
      >
        <Image src={cardImage(game)} alt="" fill sizes="(max-width: 600px) 50vw, 220px" />
        <span className={`${styles.status} ${entry.installed ? styles.installed : ''}`}>{status}</span>
      </Link>

      <div className={styles.body}>
        <h2 className={styles.title}>
          <Link href={`/games/${game.slug}`}>{game.title}</Link>
        </h2>
        {edition.id !== 'standard' && <p className={styles.edition}>{edition.name}</p>}
        <p className={styles.meta}>
          {formatPlaytime(entry.playtimeMinutes)}
          {lastPlayed && <> · {lastPlayed}</>}
          {!entry.installed && <> · {formatSize(game.sizeGB)}</>}
        </p>

        {download ? (
          <div className={styles.progressRow}>
            <ProgressBar value={download.progress} label={`${status} ${game.title}`} />
            {download.status === 'paused' ? (
              <Button variant="ghost" size="small" onClick={() => downloads.resume(game.slug)}>Resume</Button>
            ) : (
              <Button variant="ghost" size="small" onClick={() => downloads.cancel(game.slug)}>Cancel</Button>
            )}
          </div>
        ) : (
          <div className={styles.actions}>
            {entry.installed ? (
              <>
                <Button variant="secondary" size="small" onClick={() => play(game)}>
                  <PlayArrowIcon fontSize="small" /> Play
                </Button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => uninstall(game)}
                  aria-label={`Uninstall ${game.title}`}
                  title="Uninstall"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </button>
              </>
            ) : (
              <Button variant="ghost" size="small" onClick={() => downloads.install(game)}>
                <DownloadIcon fontSize="small" /> Install
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export default function LibraryView() {
  const { hydrated, session, library } = useStore()
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')

  const entries = library
    .map((entry) => ({ ...entry, game: getGame(entry.slug) }))
    .filter(filters[filter].test)
    .sort(sorts[sort].compare)

  const installedCount = library.filter((entry) => entry.installed).length
  const totalHours = Math.round(library.reduce((sum, entry) => sum + entry.playtimeMinutes, 0) / 60)

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1>Library</h1>
          {hydrated && library.length > 0 && (
            <p className={styles.stats}>
              {library.length} {library.length === 1 ? 'game' : 'games'} · {installedCount} installed · {totalHours} h played
            </p>
          )}
        </div>
      </header>

      {!hydrated ? (
        <CardGridSkeleton count={4} />
      ) : !session ? (
        <SignInPrompt
          title="Sign in to see your library"
          text="Your games, installs and playtime are saved to your account."
          next="/library"
        />
      ) : library.length === 0 ? (
        <div className={styles.empty}>
          <h2>Your library is empty</h2>
          <p>Games you buy show up here, ready to install and play.</p>
          <Button href="/games">Browse the store</Button>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <div className={styles.tabs} role="group" aria-label="Filter library">
              {Object.entries(filters).map(([value, { label }]) => (
                <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                  {label}
                </button>
              ))}
            </div>

            <div className={styles.sort}>
              <label htmlFor="library-sort">Sort by</label>
              <select id="library-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.entries(sorts).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {entries.length > 0 ? (
            <ul className={styles.grid}>
              {entries.map((entry) => (
                <li key={entry.slug}>
                  <LibraryCard entry={entry} />
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.empty}>
              <h2>Nothing here yet</h2>
              <p>No games match this filter.</p>
              <Button variant="secondary" onClick={() => setFilter('all')}>Show all games</Button>
            </div>
          )}
        </>
      )}
    </>
  )
}
