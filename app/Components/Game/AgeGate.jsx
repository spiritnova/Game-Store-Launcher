'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ageFrom, useStore } from '@/lib/store'
import Button from '../UI/Button'
import Select from '../UI/Select'
import styles from './AgeGate.module.css'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = (n) => String(n).padStart(2, '0')

// Asks for a date of birth before showing a mature game's page, like Steam does. The answer is
// remembered on this device (Settings > Store can clear it).
export default function AgeGate({ minAge, title, children }) {
    const { hydrated, prefs, updatePrefs } = useStore()
    const thisYear = new Date().getFullYear()
    const [day, setDay] = useState('1')
    const [month, setMonth] = useState('1')
    const [year, setYear] = useState(String(thisYear - 20))

    // The server render shows the page; the check runs once saved preferences have loaded
    if (!hydrated || !minAge) return children
    const age = prefs.birthDate ? ageFrom(prefs.birthDate) : null
    if (age !== null && age >= minAge) return children

    const blocked = age !== null
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate()

    return (
        <div className={styles.gate}>
            <section className={styles.card} aria-labelledby="age-gate-title" aria-describedby="age-gate-text">
                {blocked ? (
                    <>
                        <h1 id="age-gate-title">This page isn’t available</h1>
                        <p id="age-gate-text">{title} is rated for players aged {minAge} and over, so you can’t view it.</p>
                        <div className={styles.actions}>
                            <Button href="/games">Back to the store</Button>
                            <Button href="/settings#store" variant="ghost">Change date of birth</Button>
                        </div>
                    </>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            const d = Math.min(Number(day), daysInMonth)
                            updatePrefs({ birthDate: `${year}-${pad(month)}-${pad(d)}` })
                        }}
                    >
                        <h1 id="age-gate-title">Content warning</h1>
                        <p id="age-gate-text">
                            {title} may include content that isn’t suitable for all ages. Enter your date of birth to continue.
                        </p>
                        <fieldset className={styles.fields}>
                            <legend className="visually-hidden">Date of birth</legend>
                            <div>
                                <label htmlFor="age-day">Day</label>
                                <Select id="age-day" value={day} onChange={setDay} options={Array.from({ length: daysInMonth }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />
                            </div>
                            <div>
                                <label htmlFor="age-month">Month</label>
                                <Select id="age-month" value={month} onChange={setMonth} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
                            </div>
                            <div>
                                <label htmlFor="age-year">Year</label>
                                <Select id="age-year" value={year} onChange={setYear} options={Array.from({ length: 100 }, (_, i) => ({ value: String(thisYear - i), label: String(thisYear - i) }))} />
                            </div>
                        </fieldset>
                        <p className={styles.note}>Your answer is only saved in this browser.</p>
                        <div className={styles.actions}>
                            <Button type="submit">View page</Button>
                            <Link href="/games" className={styles.cancel}>Cancel</Link>
                        </div>
                    </form>
                )}
            </section>
        </div>
    )
}
