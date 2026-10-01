'use client'

import DownloadIcon from '@mui/icons-material/Download'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import VideogameAssetOutlinedIcon from '@mui/icons-material/VideogameAssetOutlined'
import { DEMO_USER, useStore } from '@/lib/store'
import Button from '../UI/Button'
import styles from './AccountBand.module.css'

// Promo shown to signed-out visitors: what an account gives you, and a one-click way in.
export default function AccountBand() {
    const { signIn } = useStore()

    return (
        <section className={`container ${styles.section}`} aria-labelledby="account-band-title">
            <div className={styles.band}>
                <div className={styles.copy}>
                    <h2 id="account-band-title">Your games, all in one launcher</h2>
                    <p>Keep a library, save a wishlist, queue downloads and pick up where you left off. No real account needed for this demo.</p>
                    <div className={styles.actions}>
                        <Button size="large" onClick={() => signIn(DEMO_USER)}>Continue as demo player</Button>
                        <Button href="/signin" variant="ghost" size="large">Sign in</Button>
                    </div>
                </div>
                <ul className={styles.perks}>
                    <li><VideogameAssetOutlinedIcon /> <span><strong>Library</strong> Install, update and launch</span></li>
                    <li><DownloadIcon /> <span><strong>Download manager</strong> Queue, pause and schedule</span></li>
                    <li><FavoriteBorderIcon /> <span><strong>Wishlist</strong> Track deals on games you want</span></li>
                </ul>
            </div>
        </section>
    )
}
