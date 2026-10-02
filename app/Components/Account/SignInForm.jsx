'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DEMO_USER, useStore } from '@/lib/store'
import Avatar from '../UI/Avatar'
import Button from '../UI/Button'
import Logo from '../UI/Logo'
import styles from './SignInForm.module.css'

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,20}$/

// Only allow redirects to paths on this site.
function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/library'
}

function validate({ username, password }) {
  const errors = {}
  if (!USERNAME_PATTERN.test(username.trim())) {
    errors.username = 'Use 3–20 letters, numbers, dots, dashes or underscores.'
  }
  if (password.length < 4) {
    errors.password = 'Use at least 4 characters.'
  }
  return errors
}

export default function SignInForm() {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const { hydrated, session, user, signIn } = useStore()
  const [values, setValues] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})

  function finish(user) {
    signIn(user)
    router.replace(next)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    // The password is only validated, never stored: this is a demo sign-in.
    finish({ username: values.username.trim() })
  }

  const update = (field) => (e) => setValues((current) => ({ ...current, [field]: e.target.value }))

  if (hydrated && session) {
    return (
      <div className={styles.card}>
        <Avatar user={user} size={56} />
        <h1>You&apos;re already signed in</h1>
        <p className={styles.lead}>Signed in as <strong>{user.displayName}</strong> (@{session.username}).</p>
        <div className={styles.row}>
          <Button href={next}>Continue</Button>
          {/* Switching accounts signs out first, then comes back here */}
          <Button variant="ghost" href="/signout?next=%2Fsignin">Use a different account</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <Logo height={48} />
      <h1>Sign in to Ultimate Game Launcher</h1>
      <p className={styles.lead}>Your library and wishlist are saved to your account.</p>

      <Button size="large" className={styles.full} onClick={() => finish(DEMO_USER)}>
        Continue as demo player
      </Button>

      <p className={styles.divider}><span>or use any username</span></p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={values.username}
            onChange={update('username')}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? 'username-error' : undefined}
          />
          {errors.username && <p id="username-error" className={styles.error}>{errors.username}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={update('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : 'password-hint'}
          />
          {errors.password ? (
            <p id="password-error" className={styles.error}>{errors.password}</p>
          ) : (
            <p id="password-hint" className={styles.hint}>
              This is a demo: any username and password work. Nothing is sent anywhere and the password isn&apos;t saved.
            </p>
          )}
        </div>

        <Button type="submit" variant="secondary" size="large" className={styles.full}>
          Sign in
        </Button>
      </form>
    </div>
  )
}
