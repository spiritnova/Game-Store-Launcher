'use client'

import { useEffect, useState } from 'react'
import { releaseTime } from '@/lib/games'

const DAY = 24 * 60 * 60 * 1000

// "Out in 3 days", "Out tomorrow"... Rendered after hydration only, since it depends on the current time.
export default function ReleaseCountdown({ game, className }) {
    const [now, setNow] = useState(null)
    useEffect(() => {
        setNow(Date.now())
        const timer = setInterval(() => setNow(Date.now()), 60000)
        return () => clearInterval(timer)
    }, [])
    if (now === null) return null

    const left = releaseTime(game) - now
    if (left <= 0) return <span className={className}>Out now</span>
    const hours = Math.ceil(left / (60 * 60 * 1000))
    const days = Math.ceil(left / DAY)
    const label = hours < 24 ? `Out in ${hours} ${hours === 1 ? 'hour' : 'hours'}` : days === 1 ? 'Out tomorrow' : `Out in ${days} days`
    return <span className={className}>{label}</span>
}
