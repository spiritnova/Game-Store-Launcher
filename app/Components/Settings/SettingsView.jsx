'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { achievementProgress } from '@/lib/achievements'
import { AVATAR_CHOICES } from '@/lib/avatars'
import { CURRENCIES } from '@/lib/currency'
import { simulatePayment } from '@/lib/payment'
import { useDownloads } from '@/lib/downloads'
import { formatSize } from '@/lib/games'
import {
  ACCENTS,
  AUTO_UPDATE_MODES,
  BANDWIDTH_LIMITS,
  CONNECTIONS,
  DEMO_PASSWORD,
  DEMO_USER,
  GIFT_CODES,
  NOTIFICATION_SETTINGS,
  PASSWORD_MIN,
  REGIONS,
  THEMES,
  WALLET_AMOUNTS,
  ageFrom,
  driveUsage,
  useStore,
} from '@/lib/store'
import { PasswordField, PasswordStrength } from '../Account/AuthForm'
import Avatar from '../UI/Avatar'
import Button from '../UI/Button'
import Select from '../UI/Select'
import SignInPrompt from '../UI/SignInPrompt'
import Skeleton from '../UI/Skeleton'
import Spinner from '../UI/Spinner'
import Purchases from './Purchases'
import styles from './SettingsView.module.css'

const sections = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'store', label: 'Store' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'downloads', label: 'Library & downloads' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'account', label: 'Account' },
]

const HUES = [210, 265, 330, 0, 25, 45, 140, 175]
const BIO_MAX = 160

function ProfileSection() {
  const { user, profile, library, community, session, friends, updateProfile } = useStore()
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio)
  const [hue, setHue] = useState(user.hue)
  // undefined = the creature generated from your username, 'initials', or one of AVATAR_CHOICES
  const [avatar, setAvatar] = useState(user.avatar)
  const [error, setError] = useState(null)

  const hours = Math.round(library.reduce((sum, e) => sum + e.playtimeMinutes, 0) / 60)
  const reviews = Object.values(community.reviews).flat().filter((r) => r.author.username === session.username).length
  const achievements = library.reduce((sum, e) => sum + (achievementProgress(e)?.unlocked ?? 0), 0)
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const dirty = displayName !== profile.displayName || bio !== profile.bio || hue !== user.hue || avatar !== user.avatar

  function handleSubmit(e) {
    e.preventDefault()
    const name = displayName.trim()
    if (name.length < 2 || name.length > 24) return setError('Use 2–24 characters.')
    updateProfile({ displayName: name, bio: bio.trim(), avatarHue: hue, avatar: avatar ?? null })
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <div className={styles.profileHeader}>
        <Avatar user={{ ...user, displayName: displayName.trim() || user.displayName, hue, avatar }} size={72} />
        <div className={styles.grow}>
          <p className={styles.profileName}>{displayName.trim() || user.displayName}</p>
          <p className={styles.muted}>@{session.username} · Member since {memberSince}</p>
        </div>
        <Button href={`/u/${session.username}`} variant="ghost" size="small">View public profile</Button>
      </div>

      <dl className={styles.stats}>
        <div><dt>Games</dt><dd>{library.length}</dd></div>
        <div><dt>Hours played</dt><dd>{hours}</dd></div>
        <div><dt>Achievements</dt><dd>{achievements}</dd></div>
        <div><dt>Friends</dt><dd>{friends.length}</dd></div>
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
        <legend>Profile picture</legend>
        <div className={styles.avatars}>
          {[undefined, ...AVATAR_CHOICES, 'initials'].map((choice) => (
            <label key={choice ?? 'default'} className={styles.avatarChoice} title={choice === 'initials' ? 'Initials' : undefined}>
              <input type="radio" name="avatar" checked={avatar === choice} onChange={() => setAvatar(choice)} />
              <Avatar user={{ ...user, displayName: displayName.trim() || user.displayName, hue, avatar: choice }} size={48} />
              <span className="visually-hidden">{choice === undefined ? 'Your own creature' : choice === 'initials' ? 'Initials' : `Creature ${choice.split('-')[1]}`}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
  const { settings, prefs, updateSettings, updatePrefs } = useStore()
  return (
    <div className={styles.card}>
      <fieldset className={styles.field}>
        <legend>Theme</legend>
        <p className={styles.muted}>Applies on this device, whether or not you’re signed in.</p>
        <div className={styles.accents}>
          {Object.entries(THEMES).map(([id, theme]) => (
            <label key={id} className={styles.accent}>
              <input type="radio" name="theme" value={id} checked={prefs.theme === id} onChange={() => updatePrefs({ theme: id })} />
              {theme.label}
            </label>
          ))}
        </div>
      </fieldset>

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

function StoreSection() {
  const { prefs, updatePrefs, formatPrice } = useStore()
  const age = prefs.birthDate ? ageFrom(prefs.birthDate) : null

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Currency</h2>
        <div className={styles.field}>
          <label htmlFor="currency">Show prices in</label>
          <Select
            id="currency"
            className={styles.select}
            value={prefs.currency}
            onChange={(currency) => updatePrefs({ currency })}
            aria-describedby="currency-help"
            options={Object.entries(CURRENCIES).map(([code, c]) => ({ value: code, label: `${c.label} (${code})` }))}
          />
          <p id="currency-help" className={styles.muted}>
            Prices are converted from US dollars at fixed demo rates, so a $59.99 game shows as {formatPrice(59.99)}.
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Mature content</h2>
        <div className={styles.toggleRow}>
          <span>
            <strong>Date of birth</strong>
            <span className={styles.muted}>
              {prefs.birthDate
                ? `Saved on this device (age ${age}). Games rated above your age are hidden.`
                : 'Games rated for older players ask for your date of birth before showing their page.'}
            </span>
          </span>
          {prefs.birthDate && <Button variant="ghost" size="small" onClick={() => updatePrefs({ birthDate: null })}>Clear</Button>}
        </div>
      </div>
    </div>
  )
}

function NotificationsSection() {
  const { settings, updateSettings } = useStore()
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Notify me about</h2>
      {Object.entries(NOTIFICATION_SETTINGS).map(([id, setting]) => (
        <Switch
          key={id}
          checked={settings.notify[id]}
          onChange={(on) => updateSettings({ notify: { ...settings.notify, [id]: on } })}
          title={setting.label}
          description={setting.description}
        />
      ))}
      <p className={styles.muted}>Notifications appear under the bell at the top of the sidebar. Refunds and receipts are always shown.</p>
    </div>
  )
}

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
  const { settings, library, updateSettings } = useStore()
  const { history, clearHistory } = useDownloads()
  const region = REGIONS[settings.region] ?? REGIONS.auto
  const drives = driveUsage(library)

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Connection</h2>

        <div className={styles.field}>
          <label htmlFor="download-region">Download region</label>
          <Select
            id="download-region"
            className={styles.select}
            value={settings.region}
            onChange={(r) => updateSettings({ region: r })}
            aria-describedby="region-help"
            options={Object.entries(REGIONS).map(([id, r]) => ({ value: id, label: r.label, group: r.group }))}
          />
          <p id="region-help" className={styles.muted}>
            {settings.region === 'auto'
              ? 'The launcher picks the fastest server for you.'
              : `Simulated: ${region.ping} ms ping, about ${Math.round(region.speed * 100)}% of your connection's speed from this region.`}
          </p>
        </div>

        <div className={styles.field}>
          <label htmlFor="bandwidth-limit">Limit download speed to</label>
          <Select
            id="bandwidth-limit"
            className={styles.select}
            value={settings.bandwidthLimit}
            onChange={(bandwidthLimit) => updateSettings({ bandwidthLimit })}
            options={Object.entries(BANDWIDTH_LIMITS).map(([id, limit]) => ({ value: id, label: limit.label }))}
          />
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
        <div className={styles.field}>
          <label htmlFor="install-drive">Install new games to</label>
          <Select
            id="install-drive"
            className={styles.select}
            value={settings.installDrive}
            onChange={(installDrive) => updateSettings({ installDrive })}
            options={drives.map((d) => ({ value: d.id, label: `${d.label} · ${formatSize(d.freeGB)} free` }))}
          />
          <p className={styles.muted}>Move games you’ve already installed from Properties in the ⋯ menu on any game.</p>
        </div>
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

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Playing</h2>
        <Switch
          checked={settings.fastPlaytime}
          onChange={(fastPlaytime) => updateSettings({ fastPlaytime })}
          title="Fast-forward playtime"
          description="Demo: each second a game runs counts as a minute, so you can watch achievements unlock. Turn off to count real time."
        />
      </div>
    </div>
  )
}

function WalletSection() {
  const { wallet, redeemedCodes, addFunds, redeemCode, formatMoney } = useStore()
  const [amount, setAmount] = useState(String(WALLET_AMOUNTS[1]))
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [adding, setAdding] = useState(false)

  async function add() {
    setAdding(true)
    await simulatePayment('card')
    addFunds(Number(amount))
    setAdding(false)
  }

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <div className={styles.balance}>
          <p className={styles.muted}>Wallet balance</p>
          <p className={styles.balanceValue}>{formatMoney(wallet.balance)}</p>
          <p className={styles.muted}>Pay for games at checkout. Refunds for wallet purchases come back here.</p>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Add funds</h2>
        <fieldset className={styles.field}>
          <legend className="visually-hidden">Amount</legend>
          <div className={styles.accents}>
            {WALLET_AMOUNTS.map((value) => (
              <label key={value} className={styles.accent}>
                <input type="radio" name="wallet-amount" value={value} checked={amount === String(value)} onChange={() => setAmount(String(value))} />
                {formatMoney(value)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className={styles.actions}>
          <p className={`${styles.muted} ${styles.grow}`}>Paid with your card ending 4242 (simulated, nothing is charged).</p>
          <Button variant="secondary" onClick={add} disabled={adding} aria-busy={adding}>
            {adding ? <><Spinner /> Processing payment…</> : `Add ${formatMoney(Number(amount))}`}
          </Button>
        </div>
      </div>

      <form
        className={styles.card}
        onSubmit={(e) => {
          e.preventDefault()
          const outcome = redeemCode(code)
          setResult(outcome)
          if (outcome.ok) setCode('')
        }}
      >
        <h2 className={styles.cardTitle}>Redeem a gift card</h2>
        <div className={styles.field}>
          <label htmlFor="gift-code">Code</label>
          <input
            id="gift-code"
            value={code}
            autoComplete="off"
            spellCheck={false}
            placeholder="XXXX-XXXX-XX"
            onChange={(e) => { setCode(e.target.value); setResult(null) }}
            aria-invalid={result ? !result.ok : undefined}
            aria-describedby="gift-code-help"
          />
          <p id="gift-code-help" className={result ? (result.ok ? styles.success : styles.error) : styles.muted} role={result ? 'status' : undefined}>
            {result?.message ?? `Demo codes: ${Object.keys(GIFT_CODES).filter((c) => !redeemedCodes.includes(c)).join(', ') || 'all redeemed'}.`}
          </p>
        </div>
        <div className={styles.actions}>
          <Button type="submit" variant="secondary" disabled={!code.trim()}>Redeem</Button>
        </div>
      </form>
    </div>
  )
}

const EMPTY_PASSWORDS = { current: '', next: '', confirm: '' }

function PasswordCard() {
  const { session, hasPassword, changePassword } = useStore()
  const [values, setValues] = useState(EMPTY_PASSWORDS)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  if (session.username === DEMO_USER.username) {
    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Password</h2>
        <p className={styles.muted}>The demo account’s password is always “{DEMO_PASSWORD}” so anyone can try the launcher. Create your own account to choose a password.</p>
      </div>
    )
  }

  const update = (field) => (e) => {
    setValues((current) => ({ ...current, [field]: e.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
    setDone(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = {}
    if (hasPassword && !values.current) found.current = 'Enter your current password.'
    if (values.next.length < PASSWORD_MIN) found.next = `Use at least ${PASSWORD_MIN} characters.`
    if (values.confirm !== values.next) found.confirm = 'The passwords don’t match.'
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setBusy(true)
    const result = await changePassword({ current: values.current, next: values.next })
    setBusy(false)
    if (!result.ok) return setErrors(result.field ? { [result.field]: result.message } : { form: result.message })
    setValues(EMPTY_PASSWORDS)
    setDone(result.message)
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.cardTitle}>{hasPassword ? 'Change password' : 'Set a password'}</h2>
      {!hasPassword && <p className={styles.muted}>This account was made before passwords existed. Set one so only you can log in.</p>}
      {errors.form && <p className={styles.error} role="alert">{errors.form}</p>}
      {/* Lets password managers match the new password to this account */}
      <input type="text" name="username" autoComplete="username" value={session.username} readOnly hidden />
      {hasPassword && (
        <PasswordField id="current-password" label="Current password" autoComplete="current-password" value={values.current} onChange={update('current')} error={errors.current} />
      )}
      <PasswordField
        id="new-password"
        label="New password"
        autoComplete="new-password"
        value={values.next}
        onChange={update('next')}
        error={errors.next}
        hint={<PasswordStrength id="new-password-hint" password={values.next} />}
      />
      <PasswordField id="confirm-password" label="Confirm new password" autoComplete="new-password" value={values.confirm} onChange={update('confirm')} error={errors.confirm} />
      <div className={styles.actions}>
        {done && <p className={`${styles.success} ${styles.grow}`} role="status">{done}</p>}
        <Button type="submit" variant="secondary" disabled={busy || !values.next} aria-busy={busy}>
          {busy ? <><Spinner /> Saving…</> : hasPassword ? 'Change password' : 'Set password'}
        </Button>
      </div>
    </form>
  )
}

function BlockedCard() {
  const { blocked, profileOf, unblockPlayer } = useStore()
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Blocked players</h2>
      {blocked.length === 0 ? (
        <p className={styles.muted}>Nobody. Block a player from the ⋯ menu on their profile to stop their friend requests and gifts.</p>
      ) : (
        <ul className={styles.blockedList}>
          {blocked.map((b) => {
            const person = profileOf(b.username)
            return (
              <li key={b.username} className={styles.toggleRow}>
                <Link href={`/u/${b.username}`} className={styles.blockedPerson}>
                  <Avatar user={person} size={32} />
                  <span>
                    <strong>{person.displayName}</strong>
                    <span className={styles.muted}>@{b.username} · Blocked {new Date(b.blockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </span>
                </Link>
                <Button variant="ghost" size="small" onClick={() => unblockPlayer(b.username)}>Unblock</Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function AccountSection() {
  return (
    <div className={styles.stack}>
      <PasswordCard />
      <BlockedCard />
      <AccountCard />
    </div>
  )
}

function AccountCard() {
  const router = useRouter()
  const { session, deleteAccount, tour, setTourDismissed } = useStore()
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
          <strong>Getting started checklist</strong>
          <span className={styles.muted}>The “Try the launcher” steps on the Discover page.</span>
        </span>
        <Button variant="ghost" size="small" onClick={() => setTourDismissed(!tour?.dismissed)}>
          {tour?.dismissed ? 'Show it' : 'Hide it'}
        </Button>
      </div>
      <div className={styles.toggleRow}>
        <span>
          <strong>Sign out</strong>
          <span className={styles.muted}>Your library and settings stay saved in this browser.</span>
        </span>
        <Button variant="ghost" size="small" href="/signout">Sign out</Button>
      </div>

      <div className={styles.danger}>
        <div className={styles.toggleRow}>
          <span>
            <strong>Delete account</strong>
            <span className={styles.muted}>Removes your library, wishlist, purchases, friends, reviews and comments. This can&apos;t be undone.</span>
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
  const tabs = useRef(null)

  // On phones the tabs scroll sideways: keep the selected one in view
  useEffect(() => {
    tabs.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  // Support deep links such as /settings#downloads, including links followed while already on this page
  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1)
      if (sections.some((s) => s.id === hash)) setActive(hash)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
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
        <SignInPrompt title="Sign in to manage your profile" text="Change your profile, appearance, currency, downloads, purchases and wallet." next="/settings" />
      </>
    )
  }

  const panels = {
    profile: ProfileSection,
    appearance: AppearanceSection,
    store: StoreSection,
    notifications: NotificationsSection,
    downloads: DownloadSection,
    purchases: Purchases,
    wallet: WalletSection,
    account: AccountSection,
  }
  const Panel = panels[active]

  return (
    <>
      {header}
      <div className={styles.layout}>
        <nav ref={tabs} className={styles.tabs} aria-label="Settings sections">
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
