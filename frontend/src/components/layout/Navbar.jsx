import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import useTheme from '../../hooks/useTheme'
import Button from '../ui/Button'
import { CloseIcon, MenuIcon, MoonIcon, SunIcon } from '../ui/icons'
import Logo from './Logo'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/events', label: 'Events' },
  { to: '/my-tickets', label: 'My Tickets' },
]

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

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
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
          <ThemeToggle />
          {/* wrapper: the button's own inline-flex would override "hidden" */}
          <span className="hidden sm:block">
            <Button to="/login" size="sm">Login</Button>
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
              <Button to="/login" size="sm" className="w-full">Login</Button>
            </span>
          </div>
        </div>
      )}
    </header>
  )
}
