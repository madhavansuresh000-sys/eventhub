import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ResultPanel from './ResultPanel'

describe('ResultPanel (what the volunteer sees at the gate)', () => {
  it('asks for a scan before the first one', () => {
    render(<ResultPanel result={null} />)
    expect(screen.getByText('Scan a ticket or type its code.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('VALID = green "Let in" with the student name', () => {
    render(<ResultPanel result={{ result: 'VALID', holder: 'Ravi Kumar', message: 'Welcome! 2 people.', code: 'EVH-ABC' }} />)
    const panel = screen.getByRole('alert') // screen readers announce it at once
    expect(panel).toHaveTextContent('Let in')
    expect(panel).toHaveTextContent('Ravi Kumar')
    expect(panel).toHaveTextContent('EVH-ABC')
    expect(panel).toHaveClass('bg-green-700')
  })

  it('ALREADY_USED = red, with when and by whom', () => {
    render(<ResultPanel result={{
      result: 'ALREADY_USED', holder: 'Ravi Kumar',
      message: 'Already used at 10:10 am by Priya Raman', code: 'EVH-ABC',
    }} />)
    const panel = screen.getByRole('alert')
    expect(panel).toHaveTextContent('Already used')
    expect(panel).toHaveTextContent('by Priya Raman')
    expect(panel).toHaveClass('bg-red-600')
  })

  it('INVALID = red "Stop", no name (the ticket does not exist)', () => {
    render(<ResultPanel result={{ result: 'INVALID', message: 'Not a ticket for this event', code: 'FAKE-1' }} />)
    const panel = screen.getByRole('alert')
    expect(panel).toHaveTextContent('Stop')
    expect(panel).toHaveClass('bg-red-600')
  })
})
