import Link from 'next/link'
import styles from './Button.module.css'

// Renders a Next.js link when `href` is given, otherwise a <button>, so links are never nested in buttons.
export default function Button({ href, variant = 'primary', size, className, children, ...props }) {
    const classes = [styles.button, styles[variant], size && styles[size], className].filter(Boolean).join(' ')

    if (href) {
        return <Link href={href} className={classes} {...props}>{children}</Link>
    }

    return <button type="button" className={classes} {...props}>{children}</button>
}
