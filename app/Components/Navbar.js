'use client'

import { useEffect, useRef, useState } from 'react'
import Gamepad from '../Assets/Gamepad'
import styles from './Navbar.module.css'
import Link from 'next/link'

export default function Navbar(){
    const [active, setIsActive] = useState(false)
    const burger = useRef()
    const navLinks = useRef()
    
    useEffect(() => {
        burger.current.addEventListener('click', () => {
            setIsActive(prev => !prev)
        })
    }, [])


    return(
        <div className={styles.nav}>
            <div className={styles.brand}>
                <Gamepad color={'white'} width={'50px'} height={'50px'}/>
                <p className={styles.logo}>Game Store</p>
            </div>
            <ul className={`${styles.navLinks} ${active ? styles['nav-active'] : ''}`} ref={navLinks}>
                <li className={styles.navItems}><Link href="/">Discover</Link></li>
                <li className={styles.navItems}><Link href="/mylibrary">My Library</Link></li>
                <li className={styles.navItems}><Link href="/news">News</Link></li>
                <li className={styles.navItems}><Link href="/about">About</Link></li>
            </ul>

            {/* <ul>
                <li className={styles.navItems}><Link href="/signin">Sign in</Link></li>
            </ul> */}

            <div className={styles.burger} ref={burger}>
                <div className={styles.line1}></div>
                <div className={styles.line2}></div>
                <div className={styles.line3}></div>
            </div>
        </div>
    )
}