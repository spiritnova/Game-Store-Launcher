'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import SearchIcon from '@mui/icons-material/Search'
import { allGames, currentPrice, discountPercent, genres, isOnSale } from '@/lib/games'
import GameCard from '../UI/GameCard'
import Button from '../UI/Button'
import styles from './BrowseGames.module.css'

const sorts = {
  featured: { label: 'Featured', compare: () => 0 },
  'price-asc': { label: 'Price: low to high', compare: (a, b) => currentPrice(a) - currentPrice(b) },
  'price-desc': { label: 'Price: high to low', compare: (a, b) => currentPrice(b) - currentPrice(a) },
  discount: { label: 'Biggest discount', compare: (a, b) => discountPercent(b) - discountPercent(a) },
  newest: { label: 'Newest', compare: (a, b) => b.releaseDate.localeCompare(a.releaseDate) },
  title: { label: 'Title A–Z', compare: (a, b) => a.title.localeCompare(b.title) },
}

export default function BrowseGames() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Filters live in the URL so filtered views can be shared, bookmarked and linked to.
  const genreParam = searchParams.get('genre')
  const genre = genres.includes(genreParam) ? genreParam : null
  const saleOnly = searchParams.get('sale') === '1'
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

  const setGenre = (value) => updateParams({ genre: value })
  const setSaleOnly = (value) => updateParams({ sale: value ? '1' : null })
  const setSort = (value) => updateParams({ sort: value === 'featured' ? null : value })

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allGames
      .filter((game) => !q || [game.title, game.developer, game.publisher].some((field) => field.toLowerCase().includes(q)))
      .filter((game) => !genre || game.genres.includes(genre))
      .filter((game) => !saleOnly || isOnSale(game))
      .sort(sorts[sort].compare)
  }, [query, genre, saleOnly, sort])

  const hasFilters = query.trim() || genre || saleOnly

  function clearFilters() {
    setQuery('')
    committedQuery.current = ''
    updateParams({ q: null, genre: null, sale: null })
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

        <label className={styles.toggle}>
          <input type="checkbox" checked={saleOnly} onChange={(e) => setSaleOnly(e.target.checked)} />
          <span className={styles.switch} aria-hidden="true" />
          On sale only
        </label>

        <div className={styles.sort}>
          <label htmlFor="browse-sort">Sort by</label>
          <select id="browse-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(sorts).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.genres} role="group" aria-label="Filter by genre">
        <button type="button" aria-pressed={!genre} onClick={() => setGenre(null)}>All genres</button>
        {genres.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={genre === name}
            onClick={() => setGenre(genre === name ? null : name)}
          >
            {name}
          </button>
        ))}
      </div>

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
          {hasFilters && <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
        </div>
      )}
    </>
  )
}
