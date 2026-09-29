import { configureStore } from '@reduxjs/toolkit'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkInTicket, fetchGateEvents, fetchGateStats } from '../api/gate'
import authReducer from '../store/authSlice'
import ScannerPage from './ScannerPage'

vi.mock('../api/gate', () => ({ fetchGateEvents: vi.fn(), fetchGateStats: vi.fn(), checkInTicket: vi.fn() }))
vi.mock('../api/auth', () => ({ fetchMe: vi.fn(), loginRequest: vi.fn(), logoutRequest: vi.fn(), registerRequest: vi.fn() }))
// the camera needs a real device; the typed code box is what we test here
vi.mock('../components/scanner/QrCamera', () => ({ default: () => null }))

const priya = { id: 4, fullName: 'Priya Raman', email: 'priya@eventhub.test', roles: ['STUDENT'], clubs: [] }
const techFest = { id: 1, title: 'Tech Fest 2026', startTime: '2026-10-12T10:00:00', venue: 'Main Auditorium', clubName: 'Coding Club', totalSeats: 200 }

function renderScanner() {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { user: priya, status: 'ready' } } })
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/scanner?event=1']}>
        <ScannerPage />
      </MemoryRouter>
    </Provider>,
  )
  return userEvent.setup()
}

async function scan(user, code) {
  await user.type(screen.getByPlaceholderText(/or type/), code)
  await user.click(screen.getByRole('button', { name: 'Check' }))
}

describe('ScannerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchGateEvents).mockResolvedValue([techFest])
    vi.mocked(fetchGateStats).mockResolvedValue({ bookedPeople: 2, checkedInPeople: 0 })
  })

  // this crashed on 29 Sep 2026: the "recent scans" list used a colour table that had moved to another file
  it('shows LET IN, then ALREADY USED for the same ticket, and lists both scans', async () => {
    vi.mocked(checkInTicket)
      .mockResolvedValueOnce({ result: 'VALID', holder: 'Ravi Kumar', message: 'Welcome!', code: 'EVH-1', stats: { bookedPeople: 2, checkedInPeople: 1 } })
      .mockResolvedValueOnce({ result: 'ALREADY_USED', holder: 'Ravi Kumar', message: 'Already used at 10:10 am by Priya Raman', code: 'EVH-1', stats: { bookedPeople: 2, checkedInPeople: 1 } })
    const user = renderScanner()
    expect(await screen.findByText('Hi Priya 👋')).toBeInTheDocument()

    await scan(user, 'EVH-1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Let in')
    expect(screen.getByText('1')).toBeInTheDocument() // live counter: 1 / 2 booked

    await scan(user, 'EVH-1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Already used')
    expect(checkInTicket).toHaveBeenCalledWith(1, 'EVH-1')

    const recent = screen.getByRole('list')
    expect(within(recent).getAllByRole('listitem')).toHaveLength(2)
  })
})
