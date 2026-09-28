import { useSelector } from 'react-redux'
import { NavLink, Outlet } from 'react-router-dom'

import { selectApprovalQueue } from '../../store/adminSlice'

const linkClass = ({ isActive }) =>
  'flex items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
  (isActive
    ? 'bg-brand-600 text-white'
    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')

function Sidebar() {
  const queue = useSelector(selectApprovalQueue)
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="h-2 bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-500 dark:to-slate-700" />
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</p>
          <p className="font-bold text-slate-900 dark:text-white">Student Affairs Office</p>
        </div>
      </div>
      {/* a row that scrolls sideways on phones, a column on laptops */}
      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col">
        <NavLink to="/admin" end className={linkClass}>Overview</NavLink>
        <NavLink to="/admin/approvals" className={linkClass}>
          Approval queue
          {queue.length > 0 && (
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900" aria-label={`${queue.length} waiting`}>
              {queue.length}
            </span>
          )}
        </NavLink>
      </nav>
    </aside>
  )
}

/** Dashboard layout for the admin area, same shape as the organizer area. */
export default function AdminLayout() {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <Sidebar />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
