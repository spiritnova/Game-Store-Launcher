import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import styles from './Logo.module.css'

export default function Logo() {
  return (
    <div className={styles.container}>
        <div className={styles.logo}>
            <SportsEsportsIcon/>
        </div>
        <p>Ultimate</p>
    </div>
  )
}
