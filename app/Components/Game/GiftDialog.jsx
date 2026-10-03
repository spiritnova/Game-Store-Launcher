'use client'

import { useState } from 'react'
import { editionPrice, getEdition } from '@/lib/games'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import Dialog from '../UI/Dialog'
import Select from '../UI/Select'
import styles from './GiftDialog.module.css'

const MESSAGE_MAX = 200
const OTHER = '__other'

export default function GiftDialog({ game, open, onClose }) {
    return (
        <Dialog open={open} onClose={onClose} title={`Gift ${game.title}`} description="Gifts go to the player’s library as soon as you check out.">
            <GiftForm game={game} onDone={onClose} />
        </Dialog>
    )
}

function GiftForm({ game, onDone }) {
    const { friends, profileOf, addGiftToCart, formatPrice } = useStore()
    const [recipient, setRecipient] = useState(friends[0]?.username ?? OTHER)
    const [other, setOther] = useState('')
    const [edition, setEdition] = useState('standard')
    const [message, setMessage] = useState('')
    const [error, setError] = useState(null)

    function handleSubmit(e) {
        e.preventDefault()
        const to = recipient === OTHER ? other : recipient
        if (!to.trim()) return setError('Choose who the gift is for.')
        const result = addGiftToCart(game, edition, to, message)
        if (!result.ok) return setError(result.message)
        onDone()
    }

    const recipients = [
        ...friends.map((f) => ({ value: f.username, label: profileOf(f.username).displayName, group: 'Friends' })),
        { value: OTHER, label: 'Someone else…', group: friends.length ? 'Other' : undefined },
    ]

    return (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
                <label htmlFor="gift-recipient">Send to</label>
                <Select id="gift-recipient" value={recipient} onChange={(v) => { setRecipient(v); setError(null) }} options={recipients} />
            </div>

            {recipient === OTHER && (
                <div className={styles.field}>
                    <label htmlFor="gift-username">Username</label>
                    <input
                        id="gift-username"
                        value={other}
                        autoComplete="off"
                        placeholder="e.g. pixelnomad"
                        onChange={(e) => { setOther(e.target.value); setError(null) }}
                    />
                </div>
            )}

            {game.editions.length > 1 && (
                <div className={styles.field}>
                    <label htmlFor="gift-edition">Edition</label>
                    <Select
                        id="gift-edition"
                        value={edition}
                        onChange={setEdition}
                        options={game.editions.map((e) => ({ value: e.id, label: `${e.name} · ${formatPrice(editionPrice(game, getEdition(game, e.id)))}` }))}
                    />
                </div>
            )}

            <div className={styles.field}>
                <label htmlFor="gift-message">Message (optional)</label>
                <textarea id="gift-message" rows={3} maxLength={MESSAGE_MAX} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Happy birthday! See you online." />
                <p className={styles.hint}>{message.length} / {MESSAGE_MAX}</p>
            </div>

            {error && <p className={styles.error} role="alert">{error}</p>}

            <div className={styles.actions}>
                <Button variant="ghost" onClick={onDone}>Cancel</Button>
                <Button type="submit">Add gift to cart · {formatPrice(editionPrice(game, getEdition(game, edition)))}</Button>
            </div>
        </form>
    )
}
