import styles from './Footer.module.css'
import Location from '@mui/icons-material/LocationOn';
import PhoneEnabledIcon from '@mui/icons-material/PhoneEnabled';
import EmailIcon from '@mui/icons-material/Email';
import Logo from './UI/Logo';

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
                    <div className={styles.contact}>
                        <div className={styles.icon}><PhoneEnabledIcon/></div>
                        <div className={styles.info}>
                            <h4>Call us</h4>
                            <p>9876543210 0</p>
                        </div>
                    </div>
                    <div className={styles.contact}>
                        <div className={styles.icon}><EmailIcon/></div>
                        <div className={styles.info}>
                            <h4>Mail us</h4>
                            <p>ibrahimabboud2000@gmail.com</p>
                        </div>
                    </div>
                </div>
            </div>


            <div className={styles.content}>
                <Logo/>
            </div>
        </div>
    </div>
  )
}
