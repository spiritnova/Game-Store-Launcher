'use client'

import { getDlc, isReleased } from '@/lib/games'
import { formatDateTime, REFUND_DAYS, REFUND_MINUTES, useStore } from '@/lib/store'
import Button from '../UI/Button'
import Dialog from '../UI/Dialog'
import styles from './PropertiesDialog.module.css'

// Explains the refund policy, then refunds the game (removing it from the library) or one of its DLC.
export default function RefundDialog({ game, dlcId = null, open, onClose }) {
    const { refundInfo, refund, formatMoney } = useStore()
    const info = open ? refundInfo(game.slug, dlcId) : null
    const name = dlcId ? getDlc(game, dlcId)?.title : game.title

    return (
        <Dialog
            open={open && Boolean(info)}
            onClose={onClose}
            title={`Refund ${name}`}
            description={dlcId
                ? `DLC bought in the last ${REFUND_DAYS} days can be refunded if you've played less than ${REFUND_MINUTES / 60} hours since buying it.`
                : !isReleased(game)
                ? `Pre-orders can be refunded any time before release, and for ${REFUND_DAYS} days after it if played for less than ${REFUND_MINUTES / 60} hours.`
                : `Games bought in the last ${REFUND_DAYS} days and played for less than ${REFUND_MINUTES / 60} hours can be refunded.`}
            footer={
                info?.eligible ? (
                    <>
                        <Button variant="ghost" onClick={onClose}>Keep {dlcId ? 'it' : 'the game'}</Button>
                        <Button onClick={() => { refund(game.slug, dlcId); onClose() }}>Refund {formatMoney(info.total)}</Button>
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
                        <div><dt>Refund amount</dt><dd>{formatMoney(info.total)}</dd></div>
                        {info.upgrades.length > 0 && (
                            <div><dt>Includes</dt><dd>{info.upgrades.map((u) => `${u.item.title} (${formatMoney(u.item.price)})`).join(', ')}</dd></div>
                        )}
                        <div><dt>Refunded to</dt><dd>{info.method === 'wallet' ? 'Your Ultimate Wallet' : 'Card ending 4242'}</dd></div>
                    </dl>
                    <p className={styles.muted}>
                        {dlcId
                            ? `${name} will be removed from ${game.title}.`
                            : `${game.title} will be uninstalled and removed from your library, along with its playtime and achievements. DLC you bought for it stays yours.`}
                    </p>
                </div>
            ) : (
                <p className={styles.muted}>This {dlcId ? 'DLC' : 'game'} can’t be refunded: {info?.reason}</p>
            )}
        </Dialog>
    )
}
