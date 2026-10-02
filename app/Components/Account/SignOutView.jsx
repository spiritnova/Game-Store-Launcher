'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useStore } from '@/lib/store'
import Avatar from '../UI/Avatar'
import Button from '../UI/Button'
import Logo from '../UI/Logo'
import Skeleton from '../UI/Skeleton'
import styles from './SignInForm.module.css'

// Only allow redirects to paths on this site.
function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null
}

// Asks before signing out, then confirms it. With ?next= it continues there instead (switching accounts).
export default function SignOutView() {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const { hydrated, session, user, playing, signOut } = useStore()
  const [signedOut, setSignedOut] = useState(null)

  if (!hydrated) {
    return (
      <div className={styles.card} aria-busy="true">
        <Skeleton width="56px" height="56px" radius="50%" />
        <Skeleton width="220px" height="28px" />
      </div>
    )
  }

  if (signedOut || !session) {
    return (
      <div className={styles.card}>
        {signedOut ? <CheckCircleIcon className={styles.done} /> : <Logo height={48} />}
        <h1>{signedOut ? 'You’ve signed out' : 'You’re not signed in'}</h1>
        <p className={styles.lead}>
          {signedOut
            ? `See you soon, ${signedOut}. Your library and settings stay saved in this browser.`
            : 'Sign in to see your library, wishlist and friends.'}
        </p>
        <div className={styles.row}>
          <Button href="/signin">Sign in{signedOut ? ' again' : ''}</Button>
          <Button href="/" variant="ghost">Back to the store</Button>
        </div>
      </div>
    )
  }

  function confirm() {
    const name = user.displayName
    signOut({ quiet: true })
    if (next) router.replace(next)
    else setSignedOut(name)
  }

  return (
    <div className={styles.card}>
      <Avatar user={user} size={64} />
      <h1>Sign out?</h1>
      <p className={styles.lead}>
        You&apos;re signed in as <strong>{user.displayName}</strong> (@{session.username}). Your library, purchases and settings stay
        saved in this browser.
        {playing && ' The game you’re playing will be closed.'}
      </p>
      <div className={styles.row}>
        <Button onClick={confirm}>Sign out</Button>
        <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </div>
  )
}
