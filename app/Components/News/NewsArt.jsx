import Image from 'next/image'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import HistoryIcon from '@mui/icons-material/History'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import { blurProps } from '@/lib/images'
import styles from './NewsArt.module.css'

// Launcher updates are about the launcher, not a game, so they get an illustration (`art` in
// data/news.json) instead of game artwork.
const ART = {
    playtime: HistoryIcon,
    wishlist: FavoriteBorderIcon,
    preorders: EventAvailableIcon,
    friends: PeopleOutlineIcon,
}

// Fills its positioned parent, like <Image fill>.
export default function NewsArt({ post, sizes, priority = false }) {
    const Icon = ART[post.art]
    if (!Icon) return <Image src={post.image} alt="" fill priority={priority} sizes={sizes} {...blurProps(post.image)} />
    return (
        <div className={`theme-dark ${styles.art}`} aria-hidden="true">
            <span className={styles.tile}>
                <Icon className={styles.icon} />
            </span>
        </div>
    )
}
