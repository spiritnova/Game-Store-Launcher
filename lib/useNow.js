'use client'

import { useEffect, useState } from 'react'

// The current time, refreshed every `intervalMs`, for live labels (online status, session timers).
// Only use the value after hydration: the server and the browser disagree about "now".
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
