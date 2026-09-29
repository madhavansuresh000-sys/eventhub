import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

import useCountdown, { formatClock } from '../../hooks/useCountdown'
import useTheme from '../../hooks/useTheme'
import { canScan, isAdmin, isOrganizer, logout, selectUser } from '../../store/authSlice'
import { selectCart } from '../../store/cartSlice'
import { notify } from '../../store/notificationsSlice'
import Button from '../ui/Button'
import { CloseIcon, MenuIcon, MoonIcon, SunIcon } from '../ui/icons'
import Logo from './Logo'
import NotificationBell from './NotificationBell'

/** Everyone sees Home and Events; the other links depend on who is logged in. */
function linksFor(user) {
  return [
    { to: '/', label: 'Home', end: true },
    { to: '/events', label: 'Events' },
    user && { to: '/my-tickets', label: 'My Tickets' },
    isOrganizer(user) && { to: '/organizer', label: 'Organizer' },
    canScan(user) && { to: '/scanner', label: 'Scanner' },
    isAdmin(user) && { to: '/admin', label: 'Admin' },
  ].filter(Boolean)
}

const linkClass = ({ isActive }) =>
  'rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
  (isActive
    ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white'
    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white')

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

/** While seats are held (cart slice), a small timer that leads back to checkout, on every page. */
function SeatHoldPill() {
  const { item, holdEndsAt } = useSelector(selectCart)
  const secondsLeft = useCountdown(holdEndsAt ?? 0)
  const location = useLocation()
  const paying = ['/checkout', '/test-payment', '/payment'].some((p) => location.pathname.startsWith(p))
  if (!item || secondsLeft === 0 || paying) return null
  return (
    <Link
      to={`/checkout/${item.bookingId}`}
      className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200"
      title={`${item.quantity} seat(s) held for ${item.title}`}
    >
      🎟️ <span className="font-mono tabular-nums">{formatClock(secondsLeft)}</span>
    </Link>
  )
}

/** Login button, or the user's name and a Logout button (auth slice). */
function AccountButtons({ className = '' }) {
  const user = useSelector(selectUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  if (!user) return <Button to="/login" size="sm" className={className}>Login</Button>
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200" title={user.email}>
        Hi, {user.fullName.split(' ')[0]}
      </span>
      <Button size="sm" variant="ghost" onClick={async () => {
        await dispatch(logout()) // the server deletes the login cookie
        dispatch(notify('You are logged out.'))
        navigate('/')
      }}>Logout</Button>
    </span>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const user = useSelector(selectUser)
  const links = linksFor(user)
  const [lastPath, setLastPath] = useState(location.pathname)

  // close the phone menu after moving to another page
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname)
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b print:hidden border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SeatHoldPill />
          {user && <NotificationBell />}
          <ThemeToggle />
          {/* wrapper: the button's own inline-flex would override "hidden" */}
          <span className="hidden sm:block">
            <AccountButtons />
          </span>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-slate-200 px-4 py-3 md:hidden dark:border-slate-800">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
            <span className="mt-2 sm:hidden">
              <AccountButtons className="w-full justify-between" />
            </span>
          </div>
        </div>
      )}
    </header>
  )
}
