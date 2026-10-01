'use client'

import { useState } from 'react'
import { authorHue, formatDate } from '@/lib/community'
import { formatRelative, useStore } from '@/lib/store'
import Avatar from '../UI/Avatar'
import Button from '../UI/Button'
import styles from './Community.module.css'

const MAX_LENGTH = 500
const PAGE = 5

export default function Comments({ game, seeded }) {
    const { hydrated, session, user, community, profileOf, addComment, deleteComment } = useStore()
    const [text, setText] = useState('')
    const [visible, setVisible] = useState(PAGE)

    const userComments = hydrated ? community.comments[game.slug] ?? [] : []
    const all = [
        ...userComments.map((c) => ({ ...c, author: profileOf(c.author.username) })),
        ...seeded.map((c) => ({ ...c, author: { ...c.author, hue: authorHue(c.author.username) } })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    function handleSubmit(e) {
        e.preventDefault()
        if (!text.trim()) return
        addComment(game, text)
        setText('')
    }

    return (
        <section id="comments" className={styles.section} aria-labelledby="comments-title">
            <div className={styles.header}>
                <h2 id="comments-title">Discussion <span className={styles.countTag}>{all.length}</span></h2>
            </div>

            {hydrated && (session ? (
                <form className={`${styles.form} ${styles.commentForm}`} onSubmit={handleSubmit}>
                    <Avatar user={user} size={36} />
                    <div className={styles.commentInput}>
                        <label htmlFor="comment-text" className="visually-hidden">Write a comment</label>
                        <textarea
                            id="comment-text"
                            rows={2}
                            maxLength={MAX_LENGTH}
                            placeholder={`Share your thoughts on ${game.title}`}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <div className={styles.formFooter}>
                            <p className={styles.hint}>{text.length} / {MAX_LENGTH}</p>
                            <Button type="submit" variant="secondary" size="small" disabled={!text.trim()}>Post comment</Button>
                        </div>
                    </div>
                </form>
            ) : (
                <p className={styles.notice}>Sign in to join the discussion.</p>
            ))}

            <ul className={styles.list}>
                {all.slice(0, visible).map((comment) => {
                    const isMine = session && !comment.seeded && comment.author.username === session.username
                    return (
                        <li key={comment.id} className={`${styles.item} ${styles.comment}`}>
                            <Avatar user={comment.author} size={32} />
                            <div className={styles.commentBody}>
                                <p className={styles.name}>
                                    {comment.author.displayName}
                                    <span className={styles.meta}>
                                        {comment.seeded ? formatDate(comment.createdAt) : formatRelative(new Date(comment.createdAt).getTime())}
                                    </span>
                                </p>
                                <p className={styles.text}>{comment.text}</p>
                                {isMine && (
                                    <div className={styles.itemActions}>
                                        <button type="button" onClick={() => deleteComment(game, comment.id)}>Delete</button>
                                    </div>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>

            {all.length > visible && (
                <button type="button" className={styles.more} onClick={() => setVisible(visible + PAGE)}>
                    Show more comments ({all.length - visible} more)
                </button>
            )}
            <p className={styles.demoNote}>Comments from demo players are sample content.</p>
        </section>
    )
}
