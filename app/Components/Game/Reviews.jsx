'use client'

import { useState } from 'react'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import { authorHue, formatDate, reviewSummary } from '@/lib/community'
import { useStore } from '@/lib/store'
import Avatar from '../UI/Avatar'
import Button from '../UI/Button'
import Select from '../UI/Select'
import styles from './Community.module.css'

const MIN_LENGTH = 20
const MAX_LENGTH = 1000
const PAGE = 5

function ReviewForm({ game, existing, onDone }) {
    const { submitReview } = useStore()
    const [recommended, setRecommended] = useState(existing?.recommended ?? null)
    const [text, setText] = useState(existing?.text ?? '')
    const [error, setError] = useState(null)

    function handleSubmit(e) {
        e.preventDefault()
        if (recommended === null) return setError('Choose whether you recommend the game.')
        if (text.trim().length < MIN_LENGTH) return setError(`Write at least ${MIN_LENGTH} characters.`)
        submitReview(game, { recommended, text })
        onDone?.()
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <fieldset className={styles.vote}>
                <legend>Do you recommend {game.title}?</legend>
                <button type="button" aria-pressed={recommended === true} onClick={() => { setRecommended(true); setError(null) }}>
                    <ThumbUpIcon fontSize="small" /> Yes
                </button>
                <button type="button" aria-pressed={recommended === false} onClick={() => { setRecommended(false); setError(null) }}>
                    <ThumbDownIcon fontSize="small" /> No
                </button>
            </fieldset>
            <label htmlFor="review-text" className="visually-hidden">Your review</label>
            <textarea
                id="review-text"
                rows={4}
                maxLength={MAX_LENGTH}
                placeholder="What did you like or dislike? Who would you recommend it to?"
                value={text}
                onChange={(e) => { setText(e.target.value); setError(null) }}
                aria-invalid={Boolean(error)}
                aria-describedby="review-help"
            />
            <div className={styles.formFooter}>
                <p id="review-help" className={error ? styles.error : styles.hint} role={error ? 'alert' : undefined}>
                    {error ?? `${text.length} / ${MAX_LENGTH}`}
                </p>
                <div className={styles.formActions}>
                    {existing && <Button variant="ghost" size="small" onClick={onDone}>Cancel</Button>}
                    <Button type="submit" variant="secondary" size="small">{existing ? 'Update review' : 'Post review'}</Button>
                </div>
            </div>
        </form>
    )
}

export default function Reviews({ game, seeded }) {
    const { hydrated, session, owns, community, profileOf, toggleHelpful, deleteReview } = useStore()
    const [sort, setSort] = useState('helpful')
    const [visible, setVisible] = useState(PAGE)
    const [editing, setEditing] = useState(false)

    const userReviews = hydrated ? community.reviews[game.slug] ?? [] : []
    const helpful = hydrated ? community.helpful : {}
    const all = [...userReviews, ...seeded].map((review) => {
        const voters = helpful[review.id] ?? []
        return {
            ...review,
            author: review.seeded ? { ...review.author, hue: authorHue(review.author.username) } : profileOf(review.author.username),
            helpfulCount: (review.baseHelpful ?? 0) + voters.length,
            votedHelpful: Boolean(session && voters.includes(session.username)),
        }
    })
    const summary = reviewSummary(all)
    const mine = session ? all.find((review) => review.author.username === session.username && !review.seeded) : null
    // Your own review always comes first so you can see (and edit) what you posted
    const sorted = [...all].sort((a, b) =>
        (b === mine) - (a === mine) ||
        (sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : b.helpfulCount - a.helpfulCount || b.createdAt.localeCompare(a.createdAt))
    )

    let composer = null
    if (!hydrated) composer = null
    else if (!session) composer = <p className={styles.notice}>Sign in to write a review.</p>
    else if (!owns(game.slug)) composer = <p className={styles.notice}>Only players who own {game.title} can review it.</p>
    else if (!mine || editing) composer = <ReviewForm game={game} existing={editing ? mine : null} onDone={() => setEditing(false)} />

    return (
        <section id="reviews" className={styles.section} aria-labelledby="reviews-title">
            <div className={styles.header}>
                <h2 id="reviews-title">Player reviews</h2>
                <div className={`${styles.summary} ${styles[summary.tone]}`}>
                    <strong>{summary.label}</strong>
                    {summary.percent !== null && (
                        <span>{summary.percent}% of {summary.total} reviews recommend this game</span>
                    )}
                </div>
                {summary.percent !== null && (
                    <div className={styles.meter} aria-hidden="true">
                        <span style={{ width: `${summary.percent}%` }} />
                    </div>
                )}
            </div>

            {composer}

            <div className={styles.listHeader}>
                <p className={styles.demoNote}>Reviews from demo players are sample content.</p>
                <div className={styles.sort}>
                    <label htmlFor="reviews-sort">Sort by</label>
                    <Select
                        id="reviews-sort"
                        value={sort}
                        onChange={setSort}
                        align="right"
                        options={[{ value: 'helpful', label: 'Most helpful' }, { value: 'newest', label: 'Newest' }]}
                    />
                </div>
            </div>

            <ul className={styles.list}>
                {sorted.slice(0, visible).map((review) => {
                    const isMine = mine && review.id === mine.id
                    const { author } = review
                    return (
                        <li key={review.id} className={`${styles.item} ${isMine ? styles.mine : ''}`}>
                            <div className={styles.author}>
                                <Avatar user={author} size={36} />
                                <div>
                                    <p className={styles.name}>
                                        {author.displayName}
                                        {isMine && <span className={styles.youTag}>You</span>}
                                    </p>
                                    <p className={styles.meta}>{review.hoursPlayed} h played · {formatDate(review.createdAt)}</p>
                                </div>
                            </div>
                            <p className={`${styles.verdict} ${review.recommended ? styles.positive : styles.negative}`}>
                                {review.recommended ? <ThumbUpIcon fontSize="small" /> : <ThumbDownIcon fontSize="small" />}
                                {review.recommended ? 'Recommended' : 'Not recommended'}
                            </p>
                            <p className={styles.text}>{review.text}</p>
                            <div className={styles.itemActions}>
                                {isMine ? (
                                    <>
                                        <button type="button" onClick={() => setEditing(true)}>Edit</button>
                                        <button type="button" onClick={() => deleteReview(game)}>Delete</button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        aria-pressed={review.votedHelpful}
                                        onClick={() => toggleHelpful(review.id)}
                                        className={styles.helpful}
                                    >
                                        <ThumbUpOutlinedIcon fontSize="inherit" /> Helpful ({review.helpfulCount})
                                    </button>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>

            {sorted.length > visible && (
                <button type="button" className={styles.more} onClick={() => setVisible(visible + PAGE)}>
                    Show more reviews ({sorted.length - visible} more)
                </button>
            )}
        </section>
    )
}
