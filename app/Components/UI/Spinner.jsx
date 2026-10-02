import styles from './Spinner.module.css'

// Small loading spinner for buttons ("Processing payment…"). Decorative: pair it with visible text.
export default function Spinner() {
    return <span className={styles.spinner} aria-hidden="true" />
}
