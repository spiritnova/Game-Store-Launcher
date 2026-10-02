'use client'

import { formatDateTime, REFUND_DAYS, REFUND_MINUTES, useStore } from '@/lib/store'
import Button from '../UI/Button'
import Dialog from '../UI/Dialog'
import styles from './PropertiesDialog.module.css'

// Explains the refund policy, then refunds the game (and removes it from the library) on confirmation.
export default function RefundDialog({ game, open, onClose }) {
    const { refundInfo, refund, formatMoney } = useStore()
    const info = open ? refundInfo(game.slug) : null

    return (
        <Dialog
            open={open && Boolean(info)}
            onClose={onClose}
            title={`Refund ${game.title}`}
            description={`Games bought in the last ${REFUND_DAYS} days and played for less than ${REFUND_MINUTES / 60} hours can be refunded.`}
            footer={
                info?.eligible ? (
                    <>
                        <Button variant="ghost" onClick={onClose}>Keep the game</Button>
                        <Button onClick={() => { refund(game.slug); onClose() }}>Refund {formatMoney(info.amount)}</Button>
                    </>
                ) : (
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                )
            }
        >
            {info?.eligible ? (
                <div className={styles.section}>
                    <dl className={styles.facts}>
                        <div><dt>Order</dt><dd>{info.transaction.id}</dd></div>
                        <div><dt>Bought</dt><dd>{formatDateTime(info.transaction.createdAt)}</dd></div>
                        <div><dt>Refund amount</dt><dd>{formatMoney(info.amount)}</dd></div>
                        <div><dt>Refunded to</dt><dd>{info.method === 'wallet' ? 'Your Ultimate Wallet' : 'Card ending 4242'}</dd></div>
                    </dl>
                    <p className={styles.muted}>{game.title} will be uninstalled and removed from your library, along with its playtime and achievements.</p>
                </div>
            ) : (
                <p className={styles.muted}>This game can’t be refunded: {info?.reason}</p>
            )}
        </Dialog>
    )
}
