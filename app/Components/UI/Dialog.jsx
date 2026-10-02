'use client'

import { useEffect, useId, useRef } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import styles from './Dialog.module.css'

// Modal dialog built on <dialog>, which traps focus, closes on Escape and returns focus to the opener.
// Children only render while open, so forms inside start fresh each time.
export default function Dialog({ open, onClose, title, description, children, footer, size = 'medium' }) {
    const ref = useRef(null)
    const titleId = useId()
    const descriptionId = useId()

    useEffect(() => {
        const dialog = ref.current
        if (open && !dialog.open) dialog.showModal()
        else if (!open && dialog.open) dialog.close()
    }, [open])

    return (
        <dialog
            ref={ref}
            className={`${styles.dialog} ${styles[size]}`}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            onClose={onClose}
            // A click on the backdrop lands on the <dialog> itself
            onClick={(e) => e.target === ref.current && onClose()}
        >
            {open && (
                <div className={styles.inner}>
                    <header className={styles.header}>
                        <div>
                            <h2 id={titleId}>{title}</h2>
                            {description && <p id={descriptionId} className={styles.description}>{description}</p>}
                        </div>
                        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
                            <CloseIcon fontSize="small" />
                        </button>
                    </header>
                    <div className={styles.body}>{children}</div>
                    {footer && <footer className={styles.footer}>{footer}</footer>}
                </div>
            )}
        </dialog>
    )
}
