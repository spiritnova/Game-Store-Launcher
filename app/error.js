'use client'

import { useEffect } from 'react'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import { clearSavedData } from '@/lib/reset-storage'
import Button from './Components/UI/Button'
import styles from './not-found.module.css'

// Shown when a page crashes while rendering. The sidebar and footer stay usable around it.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className={`container ${styles.page}`}>
      <ReportProblemOutlinedIcon className={styles.icon} />
      <p className={styles.code}>ERROR</p>
      <h1>Something went wrong on this page</h1>
      <p className={styles.text}>
        Try again first. If the problem keeps coming back, your saved demo data may be damaged: resetting it signs you out and
        restores the demo account.
      </p>
      <div className={styles.actions}>
        <Button onClick={reset}>Try again</Button>
        <Button href="/" variant="ghost">Back to Discover</Button>
        <Button variant="ghost" onClick={clearSavedData}>Reset saved data</Button>
      </div>
    </main>
  )
}
