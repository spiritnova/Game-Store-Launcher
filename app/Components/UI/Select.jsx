'use client'

import { useEffect, useId, useRef, useState } from 'react'
import CheckIcon from '@mui/icons-material/Check'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import styles from './Select.module.css'

// Custom dropdown (ARIA select-only combobox). Same job as a native <select>, but styled to match the site.
//   options: [{ value, label, group? }]  (consecutive options with the same `group` are shown under a heading)
//   align:   which edge of the button the menu lines up with ("left" or "right")
// Pair it with <label htmlFor={id}>.
export default function Select({ id, value, onChange, options, disabled = false, align = 'left', className, 'aria-describedby': describedBy }) {
    const autoId = useId()
    const baseId = id ?? autoId
    const listId = `${baseId}-list`
    const [open, setOpen] = useState(false)
    const [openUp, setOpenUp] = useState(false)
    const [active, setActive] = useState(0)
    const root = useRef(null)
    const button = useRef(null)
    const list = useRef(null)
    const typing = useRef({ text: '', timer: null })

    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
    const selected = options[selectedIndex]

    function openMenu(index = selectedIndex) {
        if (disabled) return
        const rect = button.current.getBoundingClientRect()
        const below = window.innerHeight - rect.bottom
        setOpenUp(below < 300 && rect.top > below)
        setActive(index)
        setOpen(true)
    }

    function close(refocus = true) {
        setOpen(false)
        if (refocus) button.current?.focus()
    }

    function choose(index) {
        if (options[index].value !== value) onChange(options[index].value)
        close()
    }

    useEffect(() => {
        if (!open) return
        const onPointerDown = (e) => {
            if (!root.current?.contains(e.target)) close(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [open])

    useEffect(() => {
        if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
    }, [open, active])

    function onKeyDown(e) {
        const last = options.length - 1
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                if (!open) openMenu()
                else setActive((i) => Math.min(last, i + 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                if (!open) openMenu()
                else setActive((i) => Math.max(0, i - 1))
                break
            case 'Home':
                if (open) { e.preventDefault(); setActive(0) }
                break
            case 'End':
                if (open) { e.preventDefault(); setActive(last) }
                break
            case 'Enter':
            case ' ':
                e.preventDefault()
                if (open) choose(active)
                else openMenu()
                break
            case 'Escape':
                if (open) { e.preventDefault(); close() }
                break
            case 'Tab':
                if (open) close(false)
                break
            default:
                // Type-ahead: jump to the option starting with what was typed
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    const t = typing.current
                    clearTimeout(t.timer)
                    t.text += e.key.toLowerCase()
                    t.timer = setTimeout(() => (t.text = ''), 600)
                    const match = options.findIndex((option) => option.label.toLowerCase().startsWith(t.text))
                    if (match >= 0) {
                        if (open) setActive(match)
                        else openMenu(match)
                    }
                }
        }
    }

    let lastGroup
    return (
        <div ref={root} className={`${styles.root} ${className ?? ''}`}>
            <button
                ref={button}
                id={baseId}
                type="button"
                role="combobox"
                className={`${styles.button} ${open ? styles.buttonOpen : ''}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={open ? `${baseId}-option-${active}` : undefined}
                aria-describedby={describedBy}
                disabled={disabled}
                onClick={() => (open ? close() : openMenu())}
                onKeyDown={onKeyDown}
            >
                <span className={styles.value}>{selected?.label}</span>
                <ExpandMoreIcon className={`${styles.caret} ${open ? styles.caretOpen : ''}`} fontSize="small" />
            </button>

            {open && (
                <ul
                    ref={list}
                    id={listId}
                    role="listbox"
                    tabIndex={-1}
                    className={`${styles.menu} ${openUp ? styles.up : ''} ${align === 'right' ? styles.right : ''}`}
                >
                    {options.map((option, index) => {
                        const heading = option.group && option.group !== lastGroup ? option.group : null
                        lastGroup = option.group
                        return (
                            <li key={option.value} role="presentation">
                                {heading && <p className={styles.group} role="presentation">{heading}</p>}
                                <div
                                    id={`${baseId}-option-${index}`}
                                    role="option"
                                    aria-selected={index === selectedIndex}
                                    data-index={index}
                                    className={`${styles.option} ${index === active ? styles.active : ''} ${index === selectedIndex ? styles.selected : ''}`}
                                    onPointerEnter={() => setActive(index)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => choose(index)}
                                >
                                    <span>{option.label}</span>
                                    {index === selectedIndex && <CheckIcon className={styles.check} fontSize="small" />}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
