import Image from 'next/image'
import DownloadIcon from '@mui/icons-material/Download'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import VideogameAssetOutlinedIcon from '@mui/icons-material/VideogameAssetOutlined'
import { allGames, cardImage } from '@/lib/games'
import Logo from '../Components/UI/Logo'
import styles from './auth.module.css'

// Cover art for the mosaic behind the brand panel: spotlight and featured games first
const mosaic = [...allGames.filter((game) => game.spotlight || game.featured), ...allGames].filter((game, i, list) => list.indexOf(game) === i).slice(0, 18)

export default function AuthLayout({ children }) {
  return (
    <div className={styles.auth}>
      <aside className={`theme-dark ${styles.brand}`} aria-label="Ultimate Game Launcher">
        <div className={styles.mosaic} aria-hidden="true">
          {mosaic.map((game) => (
            <div key={game.slug} className={styles.tile}>
              <Image src={cardImage(game)} alt="" fill sizes="160px" />
            </div>
          ))}
        </div>
        <div className={styles.brandContent}>
          <Logo height={64} priority />
          <div className={styles.pitch}>
            <h2>Your games, all in one launcher.</h2>
            <p>Buy, install and play {allGames.length} games, track achievements and see what your friends are playing.</p>
            <ul className={styles.perks}>
              <li><VideogameAssetOutlinedIcon fontSize="small" /> Library, collections and achievements</li>
              <li><DownloadIcon fontSize="small" /> Downloads, updates and DLC</li>
              <li><PeopleOutlineIcon fontSize="small" /> Friends, profiles and gifts</li>
            </ul>
          </div>
          <p className={styles.note}>A portfolio project. Accounts and purchases are simulated and stay in this browser.</p>
        </div>
      </aside>
      <main className={styles.panel}>{children}</main>
    </div>
  )
}
