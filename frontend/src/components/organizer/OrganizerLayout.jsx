import { NavLink, Outlet } from 'react-router-dom'

import { OrganizerDataProvider, useOrganizerData } from '../../state/OrganizerDataContext'
import { gradientFor } from '../../utils/format'

const links = [
  { to: '/organizer', label: 'Overview', end: true },
  { to: '/organizer/events/new', label: 'Create event' },
  { to: '/organizer/volunteers', label: 'Volunteers' },
]

const linkClass = ({ isActive }) =>
  'block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
  (isActive
    ? 'bg-brand-600 text-white'
    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')

function Sidebar() {
  const { club } = useOrganizerData()
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className={`h-2 bg-gradient-to-r ${gradientFor(club.slug)}`} />
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organizer</p>
          <p className="font-bold text-slate-900 dark:text-white">{club.name}</p>
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

/** Dashboard layout for the organizer area: club card + menu on the left, page on the right. */
export default function OrganizerLayout() {
  return (
    <OrganizerDataProvider>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <Sidebar />
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </OrganizerDataProvider>
  )
}
