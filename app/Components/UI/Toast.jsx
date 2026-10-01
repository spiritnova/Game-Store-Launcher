'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Link from 'next/link'
import CloseIcon from '@mui/icons-material/Close'
import styles from './Toast.module.css'

const ToastContext = createContext(null)

const DURATION = 4500

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  // toast: { message, href?, actionLabel? }
  const show = useCallback(
    (toast) => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-2), { ...toast, id }])
      setTimeout(() => dismiss(id), DURATION)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            <p>{toast.message}</p>
            {toast.href && (
              <Link href={toast.href} className={styles.action} onClick={() => dismiss(toast.id)}>
                {toast.actionLabel}
              </Link>
            )}
            <button type="button" className={styles.close} onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
              <CloseIcon fontSize="small" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside <ToastProvider>')
  return show
}
