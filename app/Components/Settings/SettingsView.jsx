'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDownloads } from '@/lib/downloads'
import { ACCENTS, AUTO_UPDATE_MODES, BANDWIDTH_LIMITS, CONNECTIONS, REGIONS, useStore } from '@/lib/store'
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

const regionGroups = Object.entries(REGIONS).reduce((groups, [id, region]) => {
  ;(groups[region.group] ??= []).push([id, region])
  return groups
}, {})

function TimeRange({ idPrefix, value, onChange, disabled }) {
  return (
    <div className={styles.timeRange}>
      <label htmlFor={`${idPrefix}-start`}>From</label>
      <input id={`${idPrefix}-start`} type="time" value={value.start} disabled={disabled} onChange={(e) => e.target.value && onChange({ ...value, start: e.target.value })} />
      <label htmlFor={`${idPrefix}-end`}>to</label>
      <input id={`${idPrefix}-end`} type="time" value={value.end} disabled={disabled} onChange={(e) => e.target.value && onChange({ ...value, end: e.target.value })} />
      {value.start > value.end && <span className={styles.muted}>Runs overnight</span>}
    </div>
  )
}

function Switch({ checked, onChange, title, description }) {
  return (
    <label className={styles.toggleRow}>
      <span>
        <strong>{title}</strong>
        <span className={styles.muted}>{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.switch} aria-hidden="true" />
    </label>
  )
}

function DownloadSection() {
  const { settings, updateSettings } = useStore()
  const { history, clearHistory } = useDownloads()
  const region = REGIONS[settings.region] ?? REGIONS.auto

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Connection</h2>

        <div className={styles.field}>
          <label htmlFor="download-region">Download region</label>
          <select id="download-region" value={settings.region} onChange={(e) => updateSettings({ region: e.target.value })} aria-describedby="region-help">
            {Object.entries(regionGroups).map(([group, regions]) => (
              <optgroup key={group} label={group}>
                {regions.map(([id, r]) => (
                  <option key={id} value={id}>{r.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p id="region-help" className={styles.muted}>
            {settings.region === 'auto'
              ? 'The launcher picks the fastest server for you.'
              : `Simulated: ${region.ping} ms ping, about ${Math.round(region.speed * 100)}% of your connection's speed from this region.`}
          </p>
        </div>

        <div className={styles.field}>
          <label htmlFor="bandwidth-limit">Limit download speed to</label>
          <select id="bandwidth-limit" value={settings.bandwidthLimit} onChange={(e) => updateSettings({ bandwidthLimit: e.target.value })}>
            {Object.entries(BANDWIDTH_LIMITS).map(([id, limit]) => (
              <option key={id} value={id}>{limit.label}</option>
            ))}
          </select>
        </div>

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

        <Switch
          checked={settings.showBits}
          onChange={(showBits) => updateSettings({ showBits })}
          title="Show speeds in bits per second"
          description="Display Mbps instead of MB/s, like internet providers do."
        />
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Download schedule</h2>
        <Switch
          checked={settings.schedule.enabled}
          onChange={(enabled) => updateSettings({ schedule: { ...settings.schedule, enabled } })}
          title="Only download during set hours"
          description="Downloads wait outside this window, handy for off-peak hours. You can always start one manually."
        />
        <TimeRange
          idPrefix="download-window"
          value={settings.schedule}
          disabled={!settings.schedule.enabled}
          onChange={(window) => updateSettings({ schedule: { ...window, enabled: settings.schedule.enabled } })}
        />
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Updates</h2>
        <fieldset className={styles.field}>
          <legend>Auto-update games</legend>
          <div className={styles.options}>
            {Object.entries(AUTO_UPDATE_MODES).map(([id, mode]) => (
              <label key={id} className={styles.option}>
                <input type="radio" name="auto-update" value={id} checked={settings.autoUpdate === id} onChange={() => updateSettings({ autoUpdate: id })} />
                <span>
                  <strong>{mode.label}</strong>
                  <span className={styles.muted}>{mode.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Update window</span>
          <TimeRange
            idPrefix="update-window"
            value={settings.updateWindow}
            disabled={settings.autoUpdate !== 'scheduled'}
            onChange={(updateWindow) => updateSettings({ updateWindow })}
          />
          <p className={styles.muted}>Only used when updates are limited to a window.</p>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Installing</h2>
        <Switch
          checked={settings.autoInstall}
          onChange={(autoInstall) => updateSettings({ autoInstall })}
          title="Install games after purchase"
          description="Start downloading new games as soon as you check out."
        />
        <div className={styles.toggleRow}>
          <span>
            <strong>Download history</strong>
            <span className={styles.muted}>{history.length} finished {history.length === 1 ? 'download' : 'downloads'} saved.</span>
          </span>
          <Button variant="ghost" size="small" onClick={clearHistory} disabled={history.length === 0}>Clear history</Button>
        </div>
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
