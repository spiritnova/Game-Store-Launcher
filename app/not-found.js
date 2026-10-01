import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import Button from './Components/UI/Button'
import styles from './not-found.module.css'

export const metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <main className={`container ${styles.page}`}>
      <SportsEsportsIcon className={styles.icon} />
      <p className={styles.code}>404</p>
      <h1>Game over: this page doesn&apos;t exist</h1>
      <p className={styles.text}>The link may be broken, or the game may have been removed from the store.</p>
      <div className={styles.actions}>
        <Button href="/">Back to Discover</Button>
        <Button href="/games" variant="ghost">Browse games</Button>
      </div>
    </main>
  )
}
