import { useEffect, useState } from 'react'

/**
 * Counts down to a fixed moment. Returns the seconds left (never below 0).
 * Uses the real clock, so it stays correct even if the browser tab was in the background.
 */
export default function useCountdown(endsAt) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}

/** 125 -> "02:05" */
export function formatClock(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${m}:${s}`
}
