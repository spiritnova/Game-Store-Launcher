'use client'

import { useId, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import SearchIcon from '@mui/icons-material/Search'
import { allGames, cardImage, currentPrice } from '@/lib/games'
import { useStore } from '@/lib/store'
import styles from './SearchBox.module.css'

const MAX_RESULTS = 6

// Titles that start with the query come first, then other title matches, then developer/publisher matches.
function suggest(query) {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const scored = []
    for (const game of allGames) {
        const title = game.title.toLowerCase()
        let score = -1
        if (title.startsWith(q)) score = 0
        else if (title.split(/[\s:-]+/).some((word) => word.startsWith(q))) score = 1
        else if (title.includes(q)) score = 2
        else if (game.developer.toLowerCase().includes(q) || game.publisher.toLowerCase().includes(q)) score = 3
        if (score >= 0) scored.push({ game, score })
    }
    return scored.sort((a, b) => a.score - b.score || a.game.title.localeCompare(b.game.title)).slice(0, MAX_RESULTS).map((s) => s.game)
}

// Store search with suggestions as you type (ARIA combobox). Enter opens the highlighted game, or the
// full results page when nothing is highlighted.
export default function SearchBox({ onNavigate }) {
    const router = useRouter()
    const { formatPrice } = useStore()
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(-1)
    const input = useRef(null)
    const id = useId()
    const listId = `${id}-list`

    const results = useMemo(() => suggest(query), [query])
    // The last option is always "See all results"
    const optionCount = query.trim() ? results.length + 1 : 0
    const expanded = open && optionCount > 0

    function go(href) {
        setOpen(false)
        setActive(-1)
        setQuery('')
        input.current?.blur()
        onNavigate?.(href)
        router.push(href)
    }

    const searchHref = () => {
        const q = query.trim()
        return q ? `/games?q=${encodeURIComponent(q)}` : '/games'
    }

    function choose(index) {
        if (index >= 0 && index < results.length) go(`/games/${results[index].slug}`)
        else go(searchHref())
    }

    function onKeyDown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => (optionCount ? (i + 1) % optionCount : -1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => (optionCount ? (i <= 0 ? optionCount - 1 : i - 1) : -1))
        } else if (e.key === 'Escape') {
            if (expanded) {
                e.preventDefault()
                setOpen(false)
                setActive(-1)
            } else if (query) {
                e.preventDefault()
                setQuery('')
            }
        }
    }

    return (
        <form
            role="search"
            className={styles.search}
            onSubmit={(e) => {
                e.preventDefault()
                choose(expanded ? active : -1)
            }}
        >
            <SearchIcon className={styles.icon} fontSize="small" />
            <label className="visually-hidden" htmlFor={`${id}-input`}>Search games</label>
            <input
                ref={input}
                id={`${id}-input`}
                type="search"
                role="combobox"
                placeholder="Search store"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={expanded}
                aria-controls={listId}
                aria-activedescendant={expanded && active >= 0 ? `${id}-option-${active}` : undefined}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value)
                    setOpen(true)
                    setActive(-1)
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={onKeyDown}
            />

            {expanded && (
                <ul id={listId} role="listbox" aria-label="Suggestions" className={styles.list}>
                    {results.map((game, index) => (
                        <li
                            key={game.slug}
                            id={`${id}-option-${index}`}
                            role="option"
                            aria-selected={index === active}
                            className={`${styles.option} ${index === active ? styles.active : ''}`}
                            // Keep focus in the input so the click doesn't blur and close the list first
                            onMouseDown={(e) => e.preventDefault()}
                            onPointerEnter={() => setActive(index)}
                            onClick={() => choose(index)}
                        >
                            <span className={styles.thumb}>
                                <Image src={cardImage(game)} alt="" fill sizes="30px" />
                            </span>
                            <span className={styles.text}>
                                <span className={styles.title}>{game.title}</span>
                                <span className={styles.meta}>{game.developer}</span>
                            </span>
                            <span className={styles.price}>{formatPrice(currentPrice(game))}</span>
                        </li>
                    ))}
                    {results.length === 0 && <li role="presentation" className={styles.none}>No games found</li>}
                    <li
                        id={`${id}-option-${results.length}`}
                        role="option"
                        aria-selected={active === results.length}
                        className={`${styles.option} ${styles.all} ${active === results.length ? styles.active : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onPointerEnter={() => setActive(results.length)}
                        onClick={() => choose(results.length)}
                    >
                        See all results for “{query.trim()}”
                    </li>
                </ul>
            )}
        </form>
    )
}
