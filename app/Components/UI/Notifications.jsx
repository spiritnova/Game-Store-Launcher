'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import CloseIcon from '@mui/icons-material/Close'
import DownloadDoneIcon from '@mui/icons-material/DownloadDone'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import ReplayIcon from '@mui/icons-material/Replay'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import { formatRelative, useStore } from '@/lib/store'
import styles from './Notifications.module.css'

const ICONS = {
    sale: LocalOfferIcon,
    download: DownloadDoneIcon,
    update: SystemUpdateAltIcon,
    achievement: EmojiEventsIcon,
    gift: CardGiftcardIcon,
    friend: PersonAddAlt1Icon,
    message: ChatBubbleOutlineIcon,
    refund: ReplayIcon,
    release: EventAvailableIcon,
}

const PANEL_WIDTH = 360

// Notifications shown in the panel are marked as read when it closes.
export default function Notifications({ className }) {
    const { hydrated, session, notifications, unreadCount, markNotificationsRead, removeNotification, clearNotifications } = useStore()
    const [open, setOpen] = useState(false)
    const [position, setPosition] = useState(null)
    const button = useRef(null)
    const panel = useRef(null)
    const seen = useRef([])
    const titleId = useId()

    function openPanel() {
        const rect = button.current.getBoundingClientRect()
        const width = Math.min(PANEL_WIDTH, window.innerWidth - 16)
        setPosition({ top: rect.bottom + 8, left: Math.min(Math.max(8, rect.left), window.innerWidth - width - 8), width })
        seen.current = notifications.filter((n) => !n.read).map((n) => n.id)
        setOpen(true)
    }

    function close(refocus = true) {
        setOpen(false)
        if (seen.current.length) markNotificationsRead(seen.current)
        seen.current = []
        if (refocus) button.current?.focus()
    }

    useEffect(() => {
        if (!open) return
        panel.current?.focus()
        const onPointerDown = (e) => {
            if (!panel.current?.contains(e.target) && !button.current?.contains(e.target)) close(false)
        }
        const onKeyDown = (e) => e.key === 'Escape' && close()
        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
        // close() only reads refs and stable store actions
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    if (!hydrated || !session) return null

    return (
        <>
            <button
                ref={button}
                type="button"
                className={className}
                aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
                title="Notifications"
                aria-expanded={open}
                aria-haspopup="dialog"
                onClick={() => (open ? close() : openPanel())}
            >
                <NotificationsNoneIcon />
                {unreadCount > 0 && <span className={styles.badge} aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {open && position && createPortal(
                <div
                    ref={panel}
                    role="dialog"
                    aria-labelledby={titleId}
                    tabIndex={-1}
                    className={styles.panel}
                    style={position}
                    // The panel lives at the end of the page: tabbing past either end goes back to the bell
                    onKeyDown={(e) => {
                        if (e.key !== 'Tab') return
                        const focusable = panel.current.querySelectorAll('a[href], button')
                        const active = document.activeElement
                        const atEnd = e.shiftKey ? active === focusable[0] || active === panel.current : active === focusable[focusable.length - 1]
                        if (atEnd) {
                            e.preventDefault()
                            close()
                        }
                    }}
                >
                    <header className={styles.header}>
                        <h2 id={titleId}>Notifications</h2>
                        {notifications.length > 0 && (
                            <button type="button" className={styles.textButton} onClick={clearNotifications}>Clear all</button>
                        )}
                    </header>

                    {notifications.length === 0 ? (
                        <p className={styles.empty}>You’re all caught up. Sales and releases, finished downloads, achievements, friend requests and gifts show up here.</p>
                    ) : (
                        <ul className={styles.list}>
                            {notifications.map((n) => {
                                const Icon = ICONS[n.type] ?? NotificationsNoneIcon
                                const content = (
                                    <>
                                        <span className={`${styles.icon} ${styles[n.type] ?? ''}`} aria-hidden="true"><Icon fontSize="small" /></span>
                                        <span className={styles.text}>
                                            <strong>{n.title}</strong>
                                            {n.body && <span>{n.body}</span>}
                                            <time dateTime={new Date(n.createdAt).toISOString()}>{formatRelative(n.createdAt)}</time>
                                        </span>
                                    </>
                                )
                                return (
                                    <li key={n.id} className={`${styles.item} ${n.read ? '' : styles.unread}`}>
                                        {n.href ? (
                                            <Link href={n.href} className={styles.link} onClick={() => close(false)}>{content}</Link>
                                        ) : (
                                            <div className={styles.link}>{content}</div>
                                        )}
                                        {!n.read && <span className="visually-hidden">Unread</span>}
                                        <button type="button" className={styles.dismiss} onClick={() => removeNotification(n.id)} aria-label={`Dismiss: ${n.title}`}>
                                            <CloseIcon fontSize="inherit" />
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                    <footer className={styles.footer}>
                        <Link href="/settings#notifications" onClick={() => close(false)}>Notification settings</Link>
                    </footer>
                </div>,
                document.body
            )}
        </>
    )
}
