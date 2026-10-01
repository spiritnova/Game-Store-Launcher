import styles from './Avatar.module.css'

// Initials on the account's colour (chosen in settings, or derived from the username).
export default function Avatar({ user, size = 36 }) {
    const initials = user.displayName
        .split(/\s+/)
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

    return (
        <span
            className={styles.avatar}
            style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: `hsl(${user.hue} 55% 42%)` }}
            aria-hidden="true"
        >
            {initials}
        </span>
    )
}
