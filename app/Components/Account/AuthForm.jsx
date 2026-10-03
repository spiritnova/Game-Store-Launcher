'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { passwordStrength } from '@/lib/password'
import { DEMO_PASSWORD, DEMO_USER, PASSWORD_MIN, USERNAME_PATTERN, useStore } from '@/lib/store'
import Button from '../UI/Button'
import Spinner from '../UI/Spinner'
import styles from './AuthForm.module.css'

const STRENGTH = ['Too short', 'Weak', 'Okay', 'Good', 'Strong']

// Only allow redirects to paths on this site.
function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

// Also used by Settings › Account to change the password
export function PasswordStrength({ id, password }) {
  const strength = passwordStrength(password)
  return (
    <div id={id} className={styles.strength}>
      <div className={styles.meter} aria-hidden="true">
        {[1, 2, 3, 4].map((level) => <span key={level} className={strength >= level ? styles[`level${strength}`] : ''} />)}
      </div>
      <p className={styles.hint}>
        {password ? `${STRENGTH[password.length < PASSWORD_MIN ? 0 : strength]} · ` : ''}At least {PASSWORD_MIN} characters.
      </p>
    </div>
  )
}

export function PasswordField({ id, label, value, onChange, error, hint, autoComplete }) {
  const [visible, setVisible] = useState(false)
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordRow}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        <button type="button" className={styles.reveal} onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>
          {visible ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
        </button>
      </div>
      {error ? <p id={`${id}-error`} className={styles.error}>{error}</p> : hint}
    </div>
  )
}

// The entry screen's form: "login" or "register". Already logged in? It goes straight to the launcher.
export default function AuthForm({ mode }) {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const { hydrated, session, logIn, register, signIn } = useStore()
  const [values, setValues] = useState({ username: '', displayName: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const registering = mode === 'register'
  const withNext = (path) => (next === '/' ? path : `${path}?next=${encodeURIComponent(next)}`)

  useEffect(() => {
    if (hydrated && session && !busy) router.replace(next)
  }, [hydrated, session, busy, next, router])

  const update = (field) => (e) => {
    setValues((current) => ({ ...current, [field]: e.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  function validate() {
    const found = {}
    if (!values.username.trim()) found.username = 'Enter your username.'
    if (!values.password) found.password = 'Enter your password.'
    if (registering) {
      if (values.username.trim() && !USERNAME_PATTERN.test(values.username.trim())) found.username = 'Use 3–20 letters, numbers, dots, dashes or underscores.'
      if (values.displayName.trim().length > 24) found.displayName = 'Use 24 characters or fewer.'
      if (values.password && values.password.length < PASSWORD_MIN) found.password = `Use at least ${PASSWORD_MIN} characters.`
      if (values.confirm !== values.password) found.confirm = 'The passwords don’t match.'
    }
    return found
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setBusy(true)
    // A short pause, like a real login round trip
    await new Promise((resolve) => setTimeout(resolve, 600))
    const result = registering
      ? await register({ username: values.username, displayName: values.displayName, password: values.password })
      : await logIn({ username: values.username, password: values.password })
    if (!result.ok) {
      setBusy(false)
      setErrors(result.field ? { [result.field]: result.message } : { form: result.message })
      return
    }
    router.replace(next)
  }

  if (!hydrated || (session && !busy)) {
    return <div className={styles.card} aria-busy="true"><Spinner /></div>
  }

  return (
    <div className={styles.card}>
      <nav className={styles.tabs} aria-label="Account">
        <Link href={withNext('/login')} aria-current={!registering ? 'page' : undefined}>Log in</Link>
        <Link href={withNext('/register')} aria-current={registering ? 'page' : undefined}>Create account</Link>
      </nav>

      <div className={styles.heading}>
        <h1>{registering ? 'Create your account' : 'Welcome back'}</h1>
        <p>{registering ? 'Your library, wishlist and friends are saved to your account.' : 'Log in to open your launcher.'}</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {errors.form && <p className={styles.formError} role="alert">{errors.form}</p>}

        {registering && (
          <div className={styles.field}>
            <label htmlFor="display-name">Display name <span className={styles.optional}>(optional)</span></label>
            <input id="display-name" autoComplete="nickname" value={values.displayName} onChange={update('displayName')} maxLength={24} aria-invalid={Boolean(errors.displayName)} aria-describedby={errors.displayName ? 'display-name-error' : 'display-name-hint'} />
            {errors.displayName
              ? <p id="display-name-error" className={styles.error}>{errors.displayName}</p>
              : <p id="display-name-hint" className={styles.hint}>What friends see. You can change it later.</p>}
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={values.username}
            onChange={update('username')}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? 'username-error' : registering ? 'username-hint' : undefined}
          />
          {errors.username
            ? <p id="username-error" className={styles.error}>{errors.username}</p>
            : registering && <p id="username-hint" className={styles.hint}>3–20 letters, numbers, dots, dashes or underscores. It can’t be changed later.</p>}
        </div>

        <PasswordField
          id="password"
          label="Password"
          autoComplete={registering ? 'new-password' : 'current-password'}
          value={values.password}
          onChange={update('password')}
          error={errors.password}
          hint={registering && <PasswordStrength id="password-hint" password={values.password} />}
        />

        {registering && (
          <PasswordField id="confirm" label="Confirm password" autoComplete="new-password" value={values.confirm} onChange={update('confirm')} error={errors.confirm} />
        )}

        <Button type="submit" size="large" className={styles.full} disabled={busy} aria-busy={busy}>
          {busy ? <><Spinner /> {registering ? 'Creating your account…' : 'Logging in…'}</> : registering ? 'Create account' : 'Log in'}
        </Button>
      </form>

      <p className={styles.divider}><span>or</span></p>

      <Button variant="ghost" size="large" className={styles.full} disabled={busy} onClick={() => { signIn(DEMO_USER); router.replace(next) }}>
        Continue as demo player
      </Button>
      <p className={styles.footnote}>
        {registering
          ? <>Already have an account? <Link href={withNext('/login')}>Log in</Link></>
          : <>The demo account&apos;s login is <strong>{DEMO_USER.username}</strong> / <strong>{DEMO_PASSWORD}</strong>. New here? <Link href={withNext('/register')}>Create an account</Link></>}
      </p>
      <p className={styles.privacy}>This is a demo: accounts stay in this browser and passwords are stored only as salted hashes.</p>
    </div>
  )
}
