'use client'

import { useState } from 'react'
import Link from 'next/link'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { getGame } from '@/lib/games'
import { formatDateTime, REFUND_DAYS, REFUND_MINUTES, useStore } from '@/lib/store'
import Button from '../UI/Button'
import RefundDialog from '../Library/RefundDialog'
import styles from './Purchases.module.css'

const TYPES = { purchase: 'Purchase', refund: 'Refund', funds: 'Wallet funds' }
const METHODS = { card: 'Card ending 4242', wallet: 'Ultimate Wallet', code: 'Gift card', free: 'Free' }

function summary(tx, profileOf) {
    const gifts = tx.items.filter((i) => i.giftTo)
    if (tx.type === 'funds') return tx.items[0].title
    if (tx.items.length === 1) {
        const item = tx.items[0]
        return item.giftTo ? `${item.title} (gift for ${profileOf(item.giftTo).displayName})` : item.title
    }
    return `${tx.items.length} items${gifts.length ? `, including ${gifts.length} ${gifts.length === 1 ? 'gift' : 'gifts'}` : ''}`
}

function Receipt({ tx, onRefund }) {
    const { refundInfo, profileOf, formatMoney } = useStore()
    const original = tx.items.reduce((sum, i) => sum + i.original, 0)
    const couponDiscount = tx.items.reduce((sum, i) => sum + (i.couponDiscount ?? 0), 0)
    const discount = original - tx.total - couponDiscount

    return (
        <div className={styles.receipt}>
            <dl className={styles.meta}>
                <div><dt>Order</dt><dd>{tx.id}</dd></div>
                <div><dt>Date</dt><dd>{formatDateTime(tx.createdAt)}</dd></div>
                <div><dt>{tx.type === 'refund' ? 'Refunded to' : 'Paid with'}</dt><dd>{METHODS[tx.method] ?? tx.method}</dd></div>
                {tx.refundOf && <div><dt>Original order</dt><dd>{tx.refundOf}</dd></div>}
            </dl>

            <table className={styles.items}>
                <thead>
                    <tr>
                        <th scope="col">Item</th>
                        <th scope="col" className={styles.amount}>Price</th>
                    </tr>
                </thead>
                <tbody>
                    {tx.items.map((item, i) => {
                        // Upgrades are refunded together with their game, not on their own
                        const refund = tx.type === 'purchase' && item.slug && !item.upgrade && !item.giftTo && !item.refunded ? refundInfo(item.slug, item.dlc ?? null) : null
                        const refundable = refund?.eligible && refund.transaction.id === tx.id
                        return (
                            <tr key={`${item.slug ?? item.title}-${i}`}>
                                <td>
                                    {item.slug && getGame(item.slug) ? <Link href={`/games/${item.slug}${item.dlc ? '#dlc' : ''}`}>{item.title}</Link> : item.title}
                                    <span className={styles.itemMeta}>
                                        {[
                                            item.dlc ? `DLC for ${item.gameTitle ?? getGame(item.slug)?.title}` : null,
                                            item.upgrade ? `Edition upgrade for ${item.gameTitle ?? getGame(item.slug)?.title}` : null,
                                            item.editionName && item.editionName !== 'Standard Edition' ? item.editionName : null,
                                            item.bundle ? `Part of ${item.bundle}` : null,
                                            item.giftTo ? `Gift for ${profileOf(item.giftTo).displayName}` : null,
                                            item.refunded ? `Refunded ${formatDateTime(item.refunded)}` : null,
                                        ].filter(Boolean).join(' · ')}
                                    </span>
                                    {refundable && (
                                        <button type="button" className={styles.refundLink} onClick={() => onRefund({ game: getGame(item.slug), dlcId: item.dlc ?? null })}>
                                            Request a refund
                                        </button>
                                    )}
                                </td>
                                <td className={styles.amount}>
                                    {item.original > item.price + 0.004 && <s>{formatMoney(item.original)}</s>}
                                    {formatMoney(item.price)}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
                <tfoot>
                    {discount > 0.004 && (
                        <tr>
                            <th scope="row">Sale &amp; bundle discounts</th>
                            <td className={styles.amount}>−{formatMoney(discount)}</td>
                        </tr>
                    )}
                    {tx.type === 'purchase' && couponDiscount > 0.004 && (
                        <tr>
                            <th scope="row">Coupon {tx.coupon}</th>
                            <td className={styles.amount}>−{formatMoney(couponDiscount)}</td>
                        </tr>
                    )}
                    <tr className={styles.total}>
                        <th scope="row">{tx.type === 'refund' ? 'Refunded' : 'Total'}</th>
                        <td className={styles.amount}>{formatMoney(tx.total)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    )
}

// Purchase history with expandable receipts and refunds.
export default function Purchases() {
    const { transactions, profileOf, formatMoney } = useStore()
    const [open, setOpen] = useState(() => new Set(transactions[0] ? [transactions[0].id] : []))
    const [refunding, setRefunding] = useState(null)

    const toggle = (id) => setOpen((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
    })

    const spent = transactions.filter((t) => t.type === 'purchase').reduce((sum, t) => sum + t.total, 0)
        - transactions.filter((t) => t.type === 'refund').reduce((sum, t) => sum + t.total, 0)

    return (
        <div className={styles.wrap}>
            <div className={styles.intro}>
                <p>
                    {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} · {formatMoney(spent)} spent on games after refunds
                </p>
                <p className={styles.policy}>
                    Games bought in the last {REFUND_DAYS} days and played for less than {REFUND_MINUTES / 60} hours can be refunded.
                </p>
            </div>

            {transactions.length === 0 ? (
                <div className={styles.empty}>
                    <p>No purchases yet. Receipts for everything you buy show up here.</p>
                    <Button href="/games" variant="secondary" size="small">Browse games</Button>
                </div>
            ) : (
                <ul className={styles.list}>
                    {transactions.map((tx) => {
                        const expanded = open.has(tx.id)
                        const positive = tx.type !== 'purchase'
                        return (
                            <li key={tx.id} className={styles.row}>
                                <button
                                    type="button"
                                    className={styles.head}
                                    aria-expanded={expanded}
                                    aria-controls={`receipt-${tx.id}`}
                                    onClick={() => toggle(tx.id)}
                                >
                                    <span className={`${styles.type} ${styles[tx.type]}`}>{TYPES[tx.type]}</span>
                                    <span className={styles.what}>
                                        <span className={styles.title}>{summary(tx, profileOf)}</span>
                                        <span className={styles.date}>{formatDateTime(tx.createdAt)}</span>
                                    </span>
                                    <span className={`${styles.sum} ${positive ? styles.credit : ''}`}>
                                        {positive ? '+' : ''}{formatMoney(tx.total)}
                                    </span>
                                    <ExpandMoreIcon className={`${styles.caret} ${expanded ? styles.caretOpen : ''}`} fontSize="small" />
                                </button>
                                {expanded && (
                                    <div id={`receipt-${tx.id}`}>
                                        <Receipt tx={tx} onRefund={setRefunding} />
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}

            {refunding && <RefundDialog game={refunding.game} dlcId={refunding.dlcId} open onClose={() => setRefunding(null)} />}
        </div>
    )
}
