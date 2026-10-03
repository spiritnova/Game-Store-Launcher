'use client'

import Link from 'next/link'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { useStore } from '@/lib/store'
import styles from './GettingStarted.module.css'

// The order matches TOUR_STEPS in lib/store/records.js
const STEPS = [
  { id: 'buy', title: 'Get a game', hint: 'Buy one, or grab a free-to-play game.', href: '/games?genre=Free%20to%20Play' },
  { id: 'install', title: 'Install it', hint: 'Downloads are simulated and finish in seconds.', href: '/library' },
  { id: 'achievement', title: 'Unlock an achievement', hint: 'Press Play. Playtime is fast-forwarded.', href: '/library' },
  { id: 'preorder', title: 'Pre-order an upcoming game', hint: 'Pre-load early, play on release day.', href: '/games?upcoming=1' },
  { id: 'friend', title: 'Make a friend', hint: 'Accept RetroFox’s request, or add someone.', href: '/friends' },
]

// A first-visit checklist pointing at the launcher's best features. Steps tick off as they're done.
export default function GettingStarted() {
  const { hydrated, session, tour, setTourDismissed } = useStore()
  if (!hydrated || !session || !tour || tour.dismissed) return null

  const done = STEPS.filter((step) => tour.done[step.id]).length
  const finished = done === STEPS.length

  return (
    <section className={`container ${styles.section}`} aria-labelledby="tour-title">
      <div className={styles.card}>
        <header className={styles.header}>
          <div>
            <h2 id="tour-title">{finished ? 'You’ve tried it all' : 'Try the launcher'}</h2>
            <p className={styles.muted}>
              {finished ? 'Everything here is simulated and saved in your browser. Enjoy exploring.' : `${done} of ${STEPS.length} done · everything is simulated, so go ahead and click around.`}
            </p>
          </div>
          <button type="button" className={styles.hide} onClick={() => setTourDismissed(true)} aria-label="Hide the checklist">
            <CloseIcon fontSize="small" />
          </button>
        </header>
        <div className={styles.progress} role="progressbar" aria-label="Checklist progress" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={done}>
          <span style={{ width: `${(done / STEPS.length) * 100}%` }} />
        </div>
        <ol className={styles.steps}>
          {STEPS.map((step) => {
            const complete = Boolean(tour.done[step.id])
            return (
              <li key={step.id}>
                <Link href={step.href} className={`${styles.step} ${complete ? styles.complete : ''}`}>
                  {complete ? <CheckCircleIcon className={styles.check} fontSize="small" /> : <RadioButtonUncheckedIcon className={styles.circle} fontSize="small" />}
                  <span>
                    <strong>{step.title}</strong>
                    <span className={styles.muted}>{step.hint}</span>
                  </span>
                  <span className="visually-hidden">{complete ? ' (done)' : ''}</span>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
