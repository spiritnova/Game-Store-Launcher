'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CheckIcon from '@mui/icons-material/Check'
import styles from './Menu.module.css'

const MENU_WIDTH = 240

// Action menu (ARIA menu button). The menu is rendered at the end of <body> and positioned against the
// window, so cards with overflow: hidden or transformed drawers can't clip or offset it.
//   items: [{ label, onSelect, icon?: Component, checked?: boolean, danger?: boolean }
//           | { heading: 'Text' } | { divider: true }]
export default function Menu({ label, children, items, className, buttonClassName }) {
    const [open, setOpen] = useState(false)
    const [position, setPosition] = useState(null)
    const [active, setActive] = useState(0)
    const baseId = useId()
    const button = useRef(null)
    const menu = useRef(null)

    // Keyboard order of the selectable items (headings and dividers are skipped)
    const actionable = items.filter((item) => item.label)
    const orderOf = new Map(actionable.map((item, order) => [item, order]))

    function openMenu(first = 0) {
        const rect = button.current.getBoundingClientRect()
        const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8)
        const below = window.innerHeight - rect.bottom
        setPosition(below > 320 || below > rect.top ? { left, top: rect.bottom + 6 } : { left, bottom: window.innerHeight - rect.top + 6 })
        setActive(first)
        setOpen(true)
    }

    function close(refocus = true) {
        setOpen(false)
        if (refocus) button.current?.focus()
    }

    function select(item) {
        close()
        item.onSelect()
    }

    // Move focus to the highlighted item
    useLayoutEffect(() => {
        if (open) menu.current?.querySelector(`[data-index="${active}"]`)?.focus()
    }, [open, active])

    // Close on outside click, scroll or resize (the menu doesn't follow the button)
    useEffect(() => {
        if (!open) return
        const onPointerDown = (e) => {
            if (!menu.current?.contains(e.target) && !button.current?.contains(e.target)) close(false)
        }
        const onMove = (e) => {
            if (!menu.current?.contains(e.target)) close(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('scroll', onMove, true)
        window.addEventListener('resize', onMove)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('scroll', onMove, true)
            window.removeEventListener('resize', onMove)
        }
    }, [open])

    function onMenuKeyDown(e) {
        const last = actionable.length - 1
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i >= last ? 0 : i + 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? last : i - 1)) }
        else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
        else if (e.key === 'End') { e.preventDefault(); setActive(last) }
        else if (e.key === 'Escape') { e.preventDefault(); close() }
        // The menu lives at the end of the page, so Tab returns to the button instead of leaving the page
        else if (e.key === 'Tab') { e.preventDefault(); close() }
    }

    return (
        <div className={`${styles.root} ${className ?? ''}`}>
            <button
                ref={button}
                type="button"
                id={`${baseId}-button`}
                className={buttonClassName}
                aria-label={label}
                title={label}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? `${baseId}-menu` : undefined}
                onClick={() => (open ? close() : openMenu())}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(0) }
                    if (e.key === 'ArrowUp') { e.preventDefault(); openMenu(actionable.length - 1) }
                }}
            >
                {children}
            </button>

            {open && position && createPortal(
                <ul
                    ref={menu}
                    id={`${baseId}-menu`}
                    role="menu"
                    aria-labelledby={`${baseId}-button`}
                    className={styles.menu}
                    style={{ ...position, width: MENU_WIDTH }}
                    onKeyDown={onMenuKeyDown}
                >
                    {items.map((item, index) => {
                        if (item.divider) return <li key={`d${index}`} role="separator" className={styles.divider} />
                        if (item.heading) return <li key={`h${index}`} role="presentation" className={styles.heading}>{item.heading}</li>
                        const order = orderOf.get(item)
                        const Icon = item.icon
                        const checkable = item.checked !== undefined
                        return (
                            <li key={`${item.label}-${index}`} role="presentation">
                                <button
                                    type="button"
                                    role={checkable ? 'menuitemcheckbox' : 'menuitem'}
                                    aria-checked={checkable ? item.checked : undefined}
                                    tabIndex={-1}
                                    data-index={order}
                                    className={`${styles.item} ${item.danger ? styles.danger : ''}`}
                                    onPointerEnter={() => setActive(order)}
                                    onClick={() => select(item)}
                                >
                                    <span className={styles.icon} aria-hidden="true">
                                        {checkable ? item.checked && <CheckIcon fontSize="inherit" /> : Icon && <Icon fontSize="inherit" />}
                                    </span>
                                    <span className={styles.label}>{item.label}</span>
                                </button>
                            </li>
                        )
                    })}
                </ul>,
                document.body
            )}
        </div>
    )
}
