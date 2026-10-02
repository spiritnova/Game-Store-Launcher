'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import Logo from '../UI/Logo'
import Spinner from '../UI/Spinner'
import styles from './AuthGate.module.css'

// The launcher only opens for a logged-in account. Accounts live in this browser's storage, so the
// check happens once the store has loaded: until then (and while redirecting) a boot screen shows.
export default function AuthGate({ children }) {
  const { hydrated, session } = useStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!hydrated || session) return
    const next = pathname + window.location.search
    router.replace(next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`)
  }, [hydrated, session, pathname, router])

  if (hydrated && session) return children

  return (
    <div className={`theme-dark ${styles.boot}`} role="status">
      <Logo height={72} priority />
      <p className={styles.status}>
        <Spinner /> {hydrated ? 'Taking you to the login screen…' : 'Starting the launcher…'}
      </p>
    </div>
  )
}
