'use client'

import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { DEMO_USER, useStore } from '@/lib/store'
import Button from './Button'
import styles from './SignInPrompt.module.css'

// Shown in place of account-only pages (library, wishlist) when nobody is signed in.
export default function SignInPrompt({ title, text, next }) {
    const { signIn } = useStore()

    return (
        <div className={styles.prompt}>
            <LockOutlinedIcon className={styles.icon} />
            <h2>{title}</h2>
            <p>{text}</p>
            <div className={styles.actions}>
                <Button onClick={() => signIn(DEMO_USER)}>Continue as demo player</Button>
                <Button href={`/login?next=${encodeURIComponent(next)}`} variant="ghost">Log in</Button>
            </div>
        </div>
    )
}
