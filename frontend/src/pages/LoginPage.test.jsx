import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loginRequest } from '../api/auth'
import authReducer from '../store/authSlice'
import notificationsReducer from '../store/notificationsSlice'
import LoginPage from './LoginPage'

// no real server in these tests: the login call is replaced by a mock we control
vi.mock('../api/auth', () => ({ loginRequest: vi.fn(), fetchMe: vi.fn(), logoutRequest: vi.fn(), registerRequest: vi.fn() }))

const ravi = { id: 5, fullName: 'Ravi Kumar', email: 'ravi@eventhub.test', roles: ['STUDENT'], clubs: [] }

/** The login page inside a fresh store and a fake router, starting at `url`. */
function renderLogin(url = '/login') {
  const store = configureStore({ reducer: { auth: authReducer, notifications: notificationsReducer } })
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/events/:id" element={<p>Event page</p>} />
          <Route path="/my-tickets" element={<p>My tickets page</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
  return userEvent.setup() // types and clicks like a real person (focus, key by key, blur)
}

async function fillAndSubmit(user, emailText, password) {
  await user.type(screen.getByLabelText('Email'), emailText)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('LoginPage', () => {
  // forget the calls of the last test (clearAllMocks, not mockReset: with Vitest 5, mockReset +
  // mockRejectedValue reports the rejection as unhandled even though LoginPage catches it)
  beforeEach(() => vi.clearAllMocks())

  it('shows what is missing and does not call the server', async () => {
    const user = renderLogin()
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveFocus() // the cursor goes to the first problem
    expect(loginRequest).not.toHaveBeenCalled()
  })

  it('checks the email format when you leave the field', async () => {
    const user = renderLogin()
    await user.type(screen.getByLabelText('Email'), 'ravi@college')
    await user.tab()
    expect(screen.getByText('Enter a valid email, e.g. name@college.edu')).toBeInTheDocument()
  })

  it('shows the server answer for a wrong password', async () => {
    // what axios throws for a 401: an Error with the server's answer in .response
    const axios401 = Object.assign(new Error('Request failed with status code 401'),
      { response: { status: 401, data: { detail: 'Wrong email or password.' } } })
    vi.mocked(loginRequest).mockRejectedValue(axios401)
    const user = renderLogin()
    await fillAndSubmit(user, 'ravi@eventhub.test', 'not-the-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.')
  })

  it('after login goes back to the page in ?next= (and trims the email)', async () => {
    vi.mocked(loginRequest).mockResolvedValue(ravi)
    const user = renderLogin('/login?next=/events/15')
    await fillAndSubmit(user, '  ravi@eventhub.test ', 'secret123')

    expect(await screen.findByText('Event page')).toBeInTheDocument()
    expect(loginRequest).toHaveBeenCalledWith({ email: 'ravi@eventhub.test', password: 'secret123' })
  })

  it('never follows a ?next= link to another website', async () => {
    vi.mocked(loginRequest).mockResolvedValue(ravi)
    const user = renderLogin('/login?next=//evil.example.com')
    await fillAndSubmit(user, 'ravi@eventhub.test', 'secret123')

    expect(await screen.findByText('My tickets page')).toBeInTheDocument() // the student home instead
  })
})
