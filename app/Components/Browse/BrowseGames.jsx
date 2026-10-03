'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import { allGames, currentPrice, discountPercent, genres, isOnSale, isReleased } from '@/lib/games'
import { useStore } from '@/lib/store'
import GameCard from '../UI/GameCard'
import Button from '../UI/Button'
import Select from '../UI/Select'
import styles from './BrowseGames.module.css'

const sorts = {
  featured: { label: 'Featured', compare: () => 0 },
  'price-asc': { label: 'Price: low to high', compare: (a, b) => currentPrice(a) - currentPrice(b) },
  'price-desc': { label: 'Price: high to low', compare: (a, b) => currentPrice(b) - currentPrice(a) },
  discount: { label: 'Biggest discount', compare: (a, b) => discountPercent(b) - discountPercent(a) },
  // Released games newest first, then pre-orders soonest first
  newest: {
    label: 'Newest',
    compare: (a, b) => isReleased(b) - isReleased(a) || (isReleased(a) ? b.releaseDate.localeCompare(a.releaseDate) : a.releaseDate.localeCompare(b.releaseDate)),
  },
  title: { label: 'Title A–Z', compare: (a, b) => a.title.localeCompare(b.title) },
}

// Prices are compared in US dollars (the store's currency); labels follow the chosen currency.
const prices = {
  any: { test: () => true },
  free: { test: (p) => p === 0 },
  'under-10': { max: 10, test: (p) => p < 10 },
  'under-20': { max: 20, test: (p) => p < 20 },
  'under-40': { max: 40, test: (p) => p < 40 },
}

// Player modes and features from the store pages
const modes = {
  'single-player': 'Single-player',
  'online-multiplayer': 'Online multiplayer',
  'online-co-op': 'Online co-op',
  'local-co-op': 'Local co-op & split screen',
  'cross-platform': 'Cross-platform multiplayer',
  controller: 'Controller support',
}

// Comma-separated list parameters, keeping only known values
const listParam = (value, known) => (value ?? '').split(',').filter((v) => known.includes(v))

export default function BrowseGames() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { hydrated, session, owns, isWishlisted, formatMoney } = useStore()

  // Filters live in the URL so filtered views can be shared, bookmarked and linked to.
  const genreParam = searchParams.get('genre')
  const modesParam = searchParams.get('modes')
  const selectedGenres = useMemo(() => listParam(genreParam, genres), [genreParam])
  const selectedModes = useMemo(() => listParam(modesParam, Object.keys(modes)), [modesParam])
  const price = prices[searchParams.get('price')] ? searchParams.get('price') : 'any'
  const saleOnly = searchParams.get('sale') === '1'
  const upcomingOnly = searchParams.get('upcoming') === '1'
  // Hiding owned or wishlisted games only applies once the signed-in library has loaded
  const hideOwned = hydrated && Boolean(session) && searchParams.get('hideOwned') === '1'
  const hideWishlisted = hydrated && Boolean(session) && searchParams.get('hideWishlisted') === '1'
  const sort = sorts[searchParams.get('sort')] ? searchParams.get('sort') : 'featured'
  const urlQuery = searchParams.get('q') ?? ''

  const updateParams = useCallback(
    (changes) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [searchParams, pathname, router]
  )

  // The search box filters immediately and writes to the URL after a short pause.
  const [query, setQuery] = useState(urlQuery)
  const committedQuery = useRef(urlQuery)

  useEffect(() => {
    if (urlQuery !== committedQuery.current) {
      committedQuery.current = urlQuery
      setQuery(urlQuery)
    }
  }, [urlQuery])

  useEffect(() => {
    const q = query.trim()
    if (q === committedQuery.current) return
    const timer = setTimeout(() => {
      committedQuery.current = q
      updateParams({ q })
    }, 300)
    return () => clearTimeout(timer)
  }, [query, updateParams])

  // On phones the filters fold away behind a button, so the results aren't pushed off screen
  const [filtersOpen, setFiltersOpen] = useState(false)

  const toggleIn = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]).join(',')
  const toggleGenre = (name) => updateParams({ genre: name ? toggleIn(selectedGenres, name) : null })
  const toggleMode = (id) => updateParams({ modes: toggleIn(selectedModes, id) })
  const setSort = (value) => updateParams({ sort: value === 'featured' ? null : value })

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allGames
      .filter((game) => !q || [game.title, game.developer, game.publisher].some((field) => field.toLowerCase().includes(q)))
      .filter((game) => selectedGenres.every((genre) => game.genres.includes(genre)))
      .filter((game) => selectedModes.every((mode) => game.features.includes(modes[mode])))
      .filter((game) => prices[price].test(currentPrice(game)))
      .filter((game) => !saleOnly || isOnSale(game))
      .filter((game) => !upcomingOnly || !isReleased(game))
      .filter((game) => !hideOwned || !owns(game.slug))
      .filter((game) => !hideWishlisted || !isWishlisted(game.slug))
      .sort(sorts[sort].compare)
  }, [query, selectedGenres, selectedModes, price, saleOnly, upcomingOnly, hideOwned, hideWishlisted, owns, isWishlisted, sort])

  const priceLabel = (id) => (id === 'any' ? 'Any price' : id === 'free' ? 'Free' : `Under ${formatMoney(prices[id].max).replace(/\.00$/, '')}`)

  // Removable chips for every active filter
  const active = [
    ...(query.trim() ? [{ key: 'q', label: `“${query.trim()}”`, clear: () => { setQuery(''); committedQuery.current = ''; updateParams({ q: null }) } }] : []),
    ...selectedGenres.map((g) => ({ key: `g-${g}`, label: g, clear: () => toggleGenre(g) })),
    ...selectedModes.map((m) => ({ key: `m-${m}`, label: modes[m], clear: () => toggleMode(m) })),
    ...(price !== 'any' ? [{ key: 'price', label: priceLabel(price), clear: () => updateParams({ price: null }) }] : []),
    ...(saleOnly ? [{ key: 'sale', label: 'On sale', clear: () => updateParams({ sale: null }) }] : []),
    ...(upcomingOnly ? [{ key: 'upcoming', label: 'Coming soon', clear: () => updateParams({ upcoming: null }) }] : []),
    ...(hideOwned ? [{ key: 'owned', label: 'Hiding owned', clear: () => updateParams({ hideOwned: null }) }] : []),
    ...(hideWishlisted ? [{ key: 'wished', label: 'Hiding wishlisted', clear: () => updateParams({ hideWishlisted: null }) }] : []),
  ]

  // Filters inside the fold-away panel (search, price and sort stay visible)
  const filterCount = selectedGenres.length + selectedModes.length + [saleOnly, upcomingOnly, hideOwned, hideWishlisted].filter(Boolean).length

  function clearFilters() {
    setQuery('')
    committedQuery.current = ''
    updateParams({ q: null, genre: null, modes: null, price: null, sale: null, upcoming: null, hideOwned: null, hideWishlisted: null })
  }

  return (
    <>
      <header className={styles.header}>
        <h1>Browse games</h1>
        <p aria-live="polite">{results.length} {results.length === 1 ? 'game' : 'games'}</p>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <SearchIcon className={styles.searchIcon} fontSize="small" />
          <label htmlFor="browse-search" className="visually-hidden">Search by title, developer or publisher</label>
          <input
            id="browse-search"
            type="search"
            placeholder="Search by title, developer or publisher"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.sort}>
          <label htmlFor="browse-price">Price</label>
          <Select
            id="browse-price"
            value={price}
            onChange={(value) => updateParams({ price: value === 'any' ? null : value })}
            options={Object.keys(prices).map((id) => ({ value: id, label: priceLabel(id) }))}
          />
        </div>

        <button
          type="button"
          className={styles.filtersButton}
          aria-expanded={filtersOpen}
          aria-controls="browse-filters"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <TuneIcon fontSize="small" /> Filters
          {filterCount > 0 && <span className={styles.filterCount}>{filterCount}</span>}
        </button>

        <div className={`${styles.sort} ${styles.sortBy}`}>
          <label htmlFor="browse-sort">Sort by</label>
          <Select id="browse-sort" value={sort} onChange={setSort} options={Object.entries(sorts).map(([value, { label }]) => ({ value, label }))} align="right" />
        </div>
      </div>

      <div id="browse-filters" className={styles.filters} data-open={filtersOpen}>
      <div className={styles.toggles}>
        <label className={styles.toggle}>
          <input type="checkbox" checked={saleOnly} onChange={(e) => updateParams({ sale: e.target.checked ? '1' : null })} />
          <span className={styles.switch} aria-hidden="true" />
          On sale only
        </label>
        <label className={styles.toggle}>
          <input type="checkbox" checked={upcomingOnly} onChange={(e) => updateParams({ upcoming: e.target.checked ? '1' : null })} />
          <span className={styles.switch} aria-hidden="true" />
          Coming soon
        </label>
        {hydrated && session && (
          <>
            <label className={styles.toggle}>
              <input type="checkbox" checked={hideOwned} onChange={(e) => updateParams({ hideOwned: e.target.checked ? '1' : null })} />
              <span className={styles.switch} aria-hidden="true" />
              Hide games I own
            </label>
            <label className={styles.toggle}>
              <input type="checkbox" checked={hideWishlisted} onChange={(e) => updateParams({ hideWishlisted: e.target.checked ? '1' : null })} />
              <span className={styles.switch} aria-hidden="true" />
              Hide wishlisted
            </label>
          </>
        )}
      </div>

      <div className={styles.filterGroup}>
        <p className={styles.groupLabel} id="genre-label">Genres <span>(match all)</span></p>
        <div className={styles.chips} role="group" aria-labelledby="genre-label">
          <button type="button" aria-pressed={selectedGenres.length === 0} onClick={() => updateParams({ genre: null })}>All genres</button>
          {genres.map((name) => (
            <button key={name} type="button" aria-pressed={selectedGenres.includes(name)} onClick={() => toggleGenre(name)}>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterGroup}>
        <p className={styles.groupLabel} id="modes-label">Player modes &amp; features</p>
        <div className={styles.chips} role="group" aria-labelledby="modes-label">
          {Object.entries(modes).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={selectedModes.includes(id)} onClick={() => toggleMode(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      </div>

      {active.length > 0 && (
        <div className={styles.active} aria-label="Active filters">
          {active.map((filter) => (
            <button key={filter.key} type="button" className={styles.activeChip} onClick={filter.clear} aria-label={`Remove filter: ${filter.label}`}>
              {filter.label} <CloseIcon fontSize="inherit" />
            </button>
          ))}
          {active.length > 1 && <button type="button" className={styles.clearAll} onClick={clearFilters}>Clear all</button>}
        </div>
      )}

      {results.length > 0 ? (
        <ul className={styles.grid}>
          {results.map((game) => (
            <li key={game.slug}>
              <GameCard game={game} headingLevel={2} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <h2>No games match your filters</h2>
          <p>Try a different search term or remove a filter.</p>
          {active.length > 0 && <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
        </div>
      )}
    </>
  )
}
