'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import AddIcon from '@mui/icons-material/Add'
import DownloadIcon from '@mui/icons-material/Download'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import FavoriteIcon from '@mui/icons-material/Favorite'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SearchIcon from '@mui/icons-material/Search'
import StopIcon from '@mui/icons-material/Stop'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import { achievementProgress } from '@/lib/achievements'
import { cardImage, formatSize, getEdition, getGame } from '@/lib/games'
import { placeholderColor } from '@/lib/image-colors'
import { statusLabel, useDownloads } from '@/lib/downloads'
import { formatLastPlayed, formatPlaytime, useStore } from '@/lib/store'
import Button from '../UI/Button'
import Select from '../UI/Select'
import ProgressBar from '../UI/ProgressBar'
import SignInPrompt from '../UI/SignInPrompt'
import { CardGridSkeleton } from '../UI/Skeleton'
import GameMenu, { CollectionNameDialog } from './GameMenu'
import styles from './LibraryView.module.css'

const filters = {
  all: { label: 'All', test: () => true },
  installed: { label: 'Installed', test: (entry) => entry.installed },
  'not-installed': { label: 'Not installed', test: (entry) => !entry.installed },
}

const sorts = {
  recent: { label: 'Recently played', compare: (a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) },
  title: { label: 'Title A–Z', compare: (a, b) => a.game.title.localeCompare(b.game.title) },
  purchased: { label: 'Recently added', compare: (a, b) => b.purchasedAt - a.purchasedAt },
  playtime: { label: 'Most played', compare: (a, b) => b.playtimeMinutes - a.playtimeMinutes },
}

function LibraryCard({ entry }) {
  const { play, stopPlaying, playing } = useStore()
  const downloads = useDownloads()
  const { game } = entry
  const download = downloads.statusOf(game.slug)
  const lastPlayed = formatLastPlayed(entry.lastPlayed)
  const edition = getEdition(game, entry.edition)
  const achievements = achievementProgress(entry)
  const isPlaying = playing?.slug === game.slug

  const update = downloads.updateFor(game.slug)
  let status = 'Not installed'
  if (isPlaying) status = 'Playing'
  else if (download) status = statusLabel(download)
  else if (entry.installed) status = update ? 'Update available' : 'Installed'

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
        <span className={`${styles.status} ${entry.installed ? styles.installed : ''} ${isPlaying ? styles.playing : ''}`}>{status}</span>
        {entry.favorite && <FavoriteIcon className={styles.favorite} fontSize="small" />}
      </Link>

      <div className={styles.body}>
        <h2 className={styles.title}>
          <Link href={`/games/${game.slug}`}>{game.title}</Link>
          {entry.favorite && <span className="visually-hidden"> (favourite)</span>}
        </h2>
        {edition.id !== 'standard' && <p className={styles.edition}>{edition.name}</p>}
        <p className={styles.meta}>
          {formatPlaytime(entry.playtimeMinutes)}
          {lastPlayed && <> · {lastPlayed}</>}
          {!entry.installed && <> · {formatSize(game.sizeGB)}</>}
        </p>
        {achievements && (
          <Link href={`/games/${game.slug}#achievements`} className={styles.achievements} title={`${achievements.unlocked} of ${achievements.total} achievements`}>
            <EmojiEventsOutlinedIcon fontSize="inherit" />
            <span className={styles.achievementBar} aria-hidden="true"><span style={{ width: `${achievements.percent}%` }} /></span>
            {achievements.unlocked}/{achievements.total}
            <span className="visually-hidden"> achievements</span>
          </Link>
        )}

        {download ? (
          <div className={styles.progressRow}>
            <ProgressBar value={download.progress} label={`${status} ${game.title}`} />
            {download.status === 'paused' || download.status === 'queued' ? (
              <Button variant="ghost" size="small" onClick={() => downloads.resume(game.slug)}>{download.status === 'paused' ? 'Resume' : 'Start'}</Button>
            ) : (
              <Button variant="ghost" size="small" onClick={() => downloads.cancel(game.slug)}>Cancel</Button>
            )}
          </div>
        ) : (
          <div className={styles.actions}>
            {entry.installed ? (
              <>
                {isPlaying ? (
                  <Button variant="secondary" size="small" onClick={stopPlaying}>
                    <StopIcon fontSize="small" /> Stop
                  </Button>
                ) : (
                  <Button variant="success" size="small" onClick={() => play(game)}>
                    <PlayArrowIcon fontSize="small" /> Play
                  </Button>
                )}
                {update && (
                  <Button variant="secondary" size="small" onClick={() => downloads.queueUpdate(game.slug)} title={`${formatSize(update.sizeGB)} update`} aria-label={`Update ${game.title}`}>
                    <SystemUpdateAltIcon fontSize="small" />
                  </Button>
                )}
              </>
            ) : (
              <Button variant="ghost" size="small" onClick={() => downloads.install(game)}>
                <DownloadIcon fontSize="small" /> Install
              </Button>
            )}
            <GameMenu game={game} />
          </div>
        )}
      </div>
    </article>
  )
}

export default function LibraryView() {
  const { hydrated, session, library, collections, createCollection, renameCollection, deleteCollection } = useStore()
  const [shelf, setShelf] = useState('all')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)

  const collection = collections.find((c) => c.id === shelf)
  const shelves = [
    { id: 'all', label: 'All games', test: (entry) => !entry.hidden },
    { id: 'favorites', label: 'Favourites', test: (entry) => entry.favorite && !entry.hidden },
    ...collections.map((c) => ({ id: c.id, label: c.name, test: (entry) => c.slugs.includes(entry.slug) })),
    { id: 'hidden', label: 'Hidden', test: (entry) => entry.hidden },
  ]
  // A deleted collection falls back to "All games"
  const current = shelves.find((s) => s.id === shelf) ?? shelves[0]
  const count = (s) => library.filter(s.test).length

  const q = query.trim().toLowerCase()
  const entries = library
    .map((entry) => ({ ...entry, game: getGame(entry.slug) }))
    .filter(current.test)
    .filter(filters[filter].test)
    .filter((entry) => !q || entry.game.title.toLowerCase().includes(q))
    .sort(sorts[sort].compare)

  const installedCount = library.filter((entry) => entry.installed).length
  const totalHours = Math.round(library.reduce((sum, entry) => sum + entry.playtimeMinutes, 0) / 60)
  const unlocked = library.reduce((sum, entry) => sum + (achievementProgress(entry)?.unlocked ?? 0), 0)

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1>Library</h1>
          {hydrated && library.length > 0 && (
            <p className={styles.stats}>
              {library.length} {library.length === 1 ? 'game' : 'games'} · {installedCount} installed · {totalHours} h played · {unlocked} achievements
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
          <nav className={styles.shelves} aria-label="Collections">
            {shelves.map((s) => (
              <button key={s.id} type="button" aria-pressed={current.id === s.id} onClick={() => setShelf(s.id)}>
                {s.label} <span className={styles.shelfCount}>{count(s)}</span>
              </button>
            ))}
            <button type="button" className={styles.newShelf} onClick={() => setDialog('new')}>
              <AddIcon fontSize="small" /> New collection
            </button>
          </nav>

          {collection && current.id === collection.id && (
            <div className={styles.collectionBar}>
              <p>Add games to “{collection.name}” from the ⋯ menu on any game.</p>
              <Button variant="ghost" size="small" onClick={() => setDialog('rename')}>Rename</Button>
              <Button variant="ghost" size="small" onClick={() => { deleteCollection(collection.id); setShelf('all') }}>Delete collection</Button>
            </div>
          )}

          <div className={styles.toolbar}>
            <div className={styles.search}>
              <SearchIcon className={styles.searchIcon} fontSize="small" />
              <label htmlFor="library-search" className="visually-hidden">Search your library</label>
              <input id="library-search" type="search" placeholder="Search your library" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            <div className={styles.tabs} role="group" aria-label="Filter by install status">
              {Object.entries(filters).map(([value, { label }]) => (
                <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                  {label}
                </button>
              ))}
            </div>

            <div className={styles.sort}>
              <label htmlFor="library-sort">Sort by</label>
              <Select id="library-sort" value={sort} onChange={setSort} options={Object.entries(sorts).map(([value, { label }]) => ({ value, label }))} align="right" />
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
              <p>
                {q ? `No games match “${query.trim()}”.`
                  : current.id === 'favorites' ? 'Mark games as favourites from the ⋯ menu on any game.'
                  : current.id === 'hidden' ? 'Games you hide show up here.'
                  : collection ? 'This collection is empty. Use the ⋯ menu on any game to add it.'
                  : 'No games match this filter.'}
              </p>
              <Button variant="secondary" onClick={() => { setFilter('all'); setQuery(''); setShelf('all') }}>Show all games</Button>
            </div>
          )}
        </>
      )}

      <CollectionNameDialog
        open={dialog === 'new'}
        onClose={() => setDialog(null)}
        title="New collection"
        onSubmit={(name) => setShelf(createCollection(name))}
      />
      <CollectionNameDialog
        open={dialog === 'rename' && Boolean(collection)}
        onClose={() => setDialog(null)}
        title="Rename collection"
        submitLabel="Save"
        initial={collection?.name}
        onSubmit={(name) => renameCollection(collection.id, name)}
      />
    </>
  )
}
