'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDownloads } from '@/lib/downloads'
import { ACCENTS, CONNECTIONS, useStore } from '@/lib/store'
import Avatar from '../UI/Avatar'
import Button from '../UI/Button'
import SignInPrompt from '../UI/SignInPrompt'
import Skeleton from '../UI/Skeleton'
import styles from './SettingsView.module.css'

const sections = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'account', label: 'Account' },
]

const HUES = [210, 265, 330, 0, 25, 45, 140, 175]
const BIO_MAX = 160

function ProfileSection() {
  const { user, profile, library, community, session, updateProfile } = useStore()
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio)
  const [hue, setHue] = useState(user.hue)
  const [error, setError] = useState(null)

  const hours = Math.round(library.reduce((sum, e) => sum + e.playtimeMinutes, 0) / 60)
  const reviews = Object.values(community.reviews).flat().filter((r) => r.author.username === session.username).length
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const dirty = displayName !== profile.displayName || bio !== profile.bio || hue !== user.hue

  function handleSubmit(e) {
    e.preventDefault()
    const name = displayName.trim()
    if (name.length < 2 || name.length > 24) return setError('Use 2–24 characters.')
    updateProfile({ displayName: name, bio: bio.trim(), avatarHue: hue })
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <div className={styles.profileHeader}>
        <Avatar user={{ ...user, displayName: displayName.trim() || user.displayName, hue }} size={72} />
        <div>
          <p className={styles.profileName}>{displayName.trim() || user.displayName}</p>
          <p className={styles.muted}>@{session.username} · Member since {memberSince}</p>
        </div>
      </div>

      <dl className={styles.stats}>
        <div><dt>Games</dt><dd>{library.length}</dd></div>
        <div><dt>Hours played</dt><dd>{hours}</dd></div>
        <div><dt>Reviews</dt><dd>{reviews}</dd></div>
      </dl>

      <div className={styles.field}>
        <label htmlFor="display-name">Display name</label>
        <input
          id="display-name"
          value={displayName}
          maxLength={24}
          onChange={(e) => { setDisplayName(e.target.value); setError(null) }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'display-name-error' : undefined}
        />
        {error && <p id="display-name-error" className={styles.error}>{error}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="bio">About me</label>
        <textarea id="bio" rows={3} maxLength={BIO_MAX} value={bio} onChange={(e) => setBio(e.target.value)} aria-describedby="bio-count" />
        <p id="bio-count" className={styles.muted}>{bio.length} / {BIO_MAX}</p>
      </div>

      <fieldset className={styles.field}>
        <legend>Avatar colour</legend>
        <div className={styles.swatches}>
          {HUES.map((h) => (
            <label key={h} className={styles.swatch} style={{ backgroundColor: `hsl(${h} 55% 42%)` }}>
              <input type="radio" name="avatar-hue" value={h} checked={hue === h} onChange={() => setHue(h)} />
              <span className="visually-hidden">Hue {h}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" variant="secondary" disabled={!dirty}>Save profile</Button>
      </div>
    </form>
  )
}

function AppearanceSection() {
  const { settings, updateSettings } = useStore()
  return (
    <div className={styles.card}>
      <fieldset className={styles.field}>
        <legend>Accent colour</legend>
        <p className={styles.muted}>Used for buttons, highlights and progress bars across the launcher.</p>
        <div className={styles.accents}>
          {Object.entries(ACCENTS).map(([id, accent]) => (
            <label key={id} className={styles.accent}>
              <input type="radio" name="accent" value={id} checked={settings.accent === id} onChange={() => updateSettings({ accent: id })} />
              <span className={styles.accentDot} style={{ backgroundColor: accent.swatch }} />
              {accent.label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

function DownloadSection() {
  const { settings, updateSettings } = useStore()
  const { history, clearHistory } = useDownloads()
  return (
    <div className={styles.card}>
      <fieldset className={styles.field}>
        <legend>Simulated connection speed</legend>
        <div className={styles.options}>
          {Object.entries(CONNECTIONS).map(([id, connection]) => (
            <label key={id} className={styles.option}>
              <input type="radio" name="connection" value={id} checked={settings.connection === id} onChange={() => updateSettings({ connection: id })} />
              <span>
                <strong>{connection.label}</strong>
                <span className={styles.muted}>{connection.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={styles.toggleRow}>
        <span>
          <strong>Install games after purchase</strong>
          <span className={styles.muted}>Start downloading new games as soon as you check out.</span>
        </span>
        <input type="checkbox" checked={settings.autoInstall} onChange={(e) => updateSettings({ autoInstall: e.target.checked })} />
        <span className={styles.switch} aria-hidden="true" />
      </label>

      <div className={styles.toggleRow}>
        <span>
          <strong>Download history</strong>
          <span className={styles.muted}>{history.length} finished {history.length === 1 ? 'download' : 'downloads'} saved.</span>
        </span>
        <Button variant="ghost" size="small" onClick={clearHistory} disabled={history.length === 0}>Clear history</Button>
      </div>
    </div>
  )
}

function AccountSection() {
  const router = useRouter()
  const { session, signOut, deleteAccount } = useStore()
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')

  return (
    <div className={styles.card}>
      <div className={styles.toggleRow}>
        <span>
          <strong>Username</strong>
          <span className={styles.muted}>@{session.username}. Usernames can&apos;t be changed.</span>
        </span>
      </div>
      <div className={styles.toggleRow}>
        <span>
          <strong>Sign out</strong>
          <span className={styles.muted}>Your library and settings stay saved in this browser.</span>
        </span>
        <Button variant="ghost" size="small" onClick={signOut}>Sign out</Button>
      </div>

      <div className={styles.danger}>
        <div className={styles.toggleRow}>
          <span>
            <strong>Delete account</strong>
            <span className={styles.muted}>Removes your library, wishlist, reviews and comments. This can&apos;t be undone.</span>
          </span>
          {!confirming && <Button variant="ghost" size="small" className={styles.dangerButton} onClick={() => setConfirming(true)}>Delete account</Button>}
        </div>
        {confirming && (
          <form
            className={styles.confirm}
            onSubmit={(e) => {
              e.preventDefault()
              if (typed !== session.username) return
              deleteAccount()
              router.push('/')
            }}
          >
            <label htmlFor="confirm-delete">Type <strong>{session.username}</strong> to confirm</label>
            <input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            <div className={styles.actions}>
              <Button variant="ghost" size="small" onClick={() => { setConfirming(false); setTyped('') }}>Cancel</Button>
              <Button type="submit" size="small" className={styles.dangerButton} disabled={typed !== session.username}>
                Permanently delete
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function SettingsView() {
  const { hydrated, session } = useStore()
  const [active, setActive] = useState('profile')

  // Support deep links such as /settings#downloads
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (sections.some((s) => s.id === hash)) setActive(hash)
  }, [])

  function select(id) {
    setActive(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  const header = (
    <header className={styles.header}>
      <h1>Profile &amp; settings</h1>
    </header>
  )

  if (!hydrated) return <>{header}<Skeleton height="320px" radius="8px" /></>
  if (!session) {
    return (
      <>
        {header}
        <SignInPrompt title="Sign in to manage your profile" text="Change your display name, avatar, accent colour and download settings." next="/settings" />
      </>
    )
  }

  const panels = { profile: ProfileSection, appearance: AppearanceSection, downloads: DownloadSection, account: AccountSection }
  const Panel = panels[active]

  return (
    <>
      {header}
      <div className={styles.layout}>
        <nav className={styles.tabs} aria-label="Settings sections">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={active === section.id ? styles.activeTab : undefined}
              aria-current={active === section.id ? 'true' : undefined}
              onClick={() => select(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>
        <section aria-label={sections.find((s) => s.id === active).label} className={styles.panel}>
          <Panel />
        </section>
      </div>
    </>
  )
}
