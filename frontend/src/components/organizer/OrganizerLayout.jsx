import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Outlet } from 'react-router-dom'

import { clubsWithRole, selectUser } from '../../store/authSlice'
import { clubSelected, loadClubEvents, selectClub, selectOrganizer } from '../../store/organizerSlice'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import { Skeleton } from '../ui/Loader'
import { gradientFor } from '../../utils/format'

const links = [
  { to: '/organizer', label: 'Overview', end: true },
  { to: '/organizer/events/new', label: 'Create event' },
  { to: '/organizer/analytics', label: 'Analytics' },
  { to: '/organizer/volunteers', label: 'Volunteers' },
]

const linkClass = ({ isActive }) =>
  'block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
  (isActive
    ? 'bg-brand-600 text-white'
    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')

/** Only for someone who organizes 2 or more clubs. */
function ClubSwitcher() {
  const dispatch = useDispatch()
  const mine = clubsWithRole(useSelector(selectUser), 'ORGANIZER')
  const { clubId } = useSelector(selectOrganizer)
  if (mine.length < 2) return null
  return (
    <label className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
      Switch club
      <select
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        value={clubId ?? ''}
        onChange={(e) => {
          dispatch(clubSelected(Number(e.target.value)))
          dispatch(loadClubEvents())
        }}
      >
        {mine.map((c) => <option key={c.clubId} value={c.clubId}>{c.clubName}</option>)}
      </select>
    </label>
  )
}

function Sidebar() {
  const club = useSelector(selectClub)
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className={`h-2 bg-gradient-to-r ${gradientFor(club?.slug)}`} />
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Organizer</p>
          <p className="font-bold text-slate-900 dark:text-white">{club?.name ?? 'Loading…'}</p>
          <ClubSwitcher />
        </div>
      </div>
      {/* a row that scrolls sideways on phones, a column on laptops */}
      <nav aria-label="Organizer" className="flex gap-1 overflow-x-auto lg:flex-col">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink>
        ))}
      </nav>
    </aside>
  )
}

/** Loading and error screens are shared by every organizer page. */
function Content() {
  const dispatch = useDispatch()
  const { status, error } = useSelector(selectOrganizer)
  if (status === 'failed') {
    return <EmptyState title="Could not load your club's events" message={error}
      action={<Button onClick={() => dispatch(loadClubEvents())}>Try again</Button>} />
  }
  if (status !== 'ready') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }
  return <Outlet />
}

/** Dashboard layout for the organizer area: club card + menu on the left, page on the right. */
export default function OrganizerLayout() {
  const dispatch = useDispatch()

  // fresh data from the backend every time the organizer area opens (the admin may have approved something)
  useEffect(() => {
    dispatch(loadClubEvents())
  }, [dispatch])

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <Sidebar />
      <div className="min-w-0">
        <Content />
      </div>
    </div>
  )
}
