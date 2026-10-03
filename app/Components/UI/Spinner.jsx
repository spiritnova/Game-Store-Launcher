import styles from './Spinner.module.css'

// decorative only, always pair it with visible text
export default function Spinner() {
    return <span className={styles.spinner} aria-hidden="true" />
}
