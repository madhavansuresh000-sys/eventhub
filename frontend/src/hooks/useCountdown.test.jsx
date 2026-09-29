import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import useCountdown, { formatClock } from './useCountdown'

/** A tiny component that shows the hook's value, like the checkout page does. */
function Timer({ endsAt }) {
  return <p>{formatClock(useCountdown(endsAt))}</p>
}

describe('useCountdown (the 10-minute seat hold timer)', () => {
  // fake timers: the test moves the clock itself, so it does not have to wait 10 real minutes
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-29T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('counts down every second and stops at 00:00', () => {
    render(<Timer endsAt={Date.now() + 10 * 60 * 1000} />)
    expect(screen.getByText('10:00')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(65 * 1000))
    expect(screen.getByText('08:55')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(20 * 60 * 1000)) // long after the end
    expect(screen.getByText('00:00')).toBeInTheDocument() // never negative
  })

  it('follows the real clock, so a tab that slept in the background is still right', () => {
    render(<Timer endsAt={Date.now() + 5 * 60 * 1000} />)
    // the browser paused the timers, but 3 minutes really passed; the next tick catches up
    vi.setSystemTime(new Date('2026-09-29T10:03:00'))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('01:59')).toBeInTheDocument()
  })
})

describe('formatClock', () => {
  it('writes minutes and seconds with two digits', () => {
    expect(formatClock(125)).toBe('02:05')
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(600)).toBe('10:00')
  })
})
