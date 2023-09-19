import styles from './Footer.module.css'
import Location from '@mui/icons-material/LocationOn';

export default function Footer() {
  return (
    <div className={styles.footer}>
        <div className={styles.upper}>
            <div className={styles.contacts}>
                <div className={styles.contactrow}>
                    <div className={styles.contact}>
                        <div className={styles.icon}><Location/></div>
                        <div className={styles.info}>
                            <h4>Find us</h4>
                            <p>1010 Avenue, sw 54321, chandigarh</p>
                        </div>
                    </div>
                    <div className={styles.contact}></div>
                    <div className={styles.contact}></div>
                </div>
            </div>

            
        </div>
    </div>
  )
}
