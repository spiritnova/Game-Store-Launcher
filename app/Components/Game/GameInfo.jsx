import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined'
import DevicesIcon from '@mui/icons-material/Devices'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import GroupsIcon from '@mui/icons-material/Groups'
import HdrOnIcon from '@mui/icons-material/HdrOn'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import PublicIcon from '@mui/icons-material/Public'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import WeekendIcon from '@mui/icons-material/Weekend'
import styles from './GameInfo.module.css'

const featureIcons = {
  'Single-player': PersonOutlineIcon,
  'Online multiplayer': PublicIcon,
  'Online co-op': GroupsIcon,
  'Local co-op & split screen': WeekendIcon,
  'Cross-platform multiplayer': DevicesIcon,
  'Controller support': SportsEsportsIcon,
  Achievements: EmojiEventsOutlinedIcon,
  'Cloud saves': CloudDoneOutlinedIcon,
  HDR: HdrOnIcon,
  'In-game purchases': ShoppingBagOutlinedIcon,
}

export function Features({ features }) {
  return (
    <section aria-labelledby="features-title">
      <h2 id="features-title" className={styles.title}>Game features</h2>
      <ul className={styles.features}>
        {features.map((feature) => {
          const Icon = featureIcons[feature]
          return (
            <li key={feature}>
              <Icon fontSize="small" /> {feature}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function SystemRequirements({ requirements }) {
  const columns = [
    ['Minimum', requirements.minimum],
    ['Recommended', requirements.recommended],
  ].filter(([, rows]) => rows.length > 0)

  return (
    <section aria-labelledby="requirements-title">
      <h2 id="requirements-title" className={styles.title}>System requirements</h2>
      <div className={styles.requirements}>
        {columns.map(([label, rows]) => (
          <div key={label} className={styles.column}>
            <h3>{label}</h3>
            <dl>
              {rows.map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}
