import { avatarSeed, sprite, SPRITE_SIZE } from '@/lib/avatars'
import styles from './Avatar.module.css'

const cells = (list) => list.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join('')

export default function Avatar({ user, size = 36 }) {
    const seed = avatarSeed(user)
    const box = { width: size, height: size }

    if (seed === 'initials') {
        const initials = user.displayName
            .split(/\s+/)
            .map((word) => word[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        return (
            <span className={styles.avatar} style={{ ...box, fontSize: size * 0.4, backgroundColor: `hsl(${user.hue} 55% 42%)` }} aria-hidden="true">
                {initials}
            </span>
        )
    }

    const { body, shade, eyes } = sprite(seed)
    const pad = 2.5
    return (
        <span className={styles.avatar} style={{ ...box, background: `radial-gradient(circle at 50% 35%, hsl(${user.hue} 45% 26%), hsl(${user.hue} 50% 12%))` }} aria-hidden="true">
            <svg viewBox={`${-pad} ${-pad} ${SPRITE_SIZE + pad * 2} ${SPRITE_SIZE + pad * 2}`} width={size} height={size} shapeRendering="crispEdges">
                <path d={cells(body)} fill={`hsl(${user.hue} 75% 62%)`} />
                <path d={cells(shade)} fill={`hsl(${user.hue} 80% 76%)`} />
                <path d={cells(eyes)} fill="#0b0d14" />
            </svg>
        </span>
    )
}
