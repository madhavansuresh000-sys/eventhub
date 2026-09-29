import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/notifications'
import { BellIcon } from '../ui/icons'

const POLL_MS = 30_000 // ask the server every 30 seconds (simple; Phase 9 could use WebSockets instead)

const kindEmoji = {
  SEAT_OFFERED: '🎉', BOOKING_CONFIRMED: '🎟️', EVENT_REMINDER: '⏰', EVENT_APPROVED: '✅', EVENT_SENT_BACK: '↩️',
}

/** "just now", "5 min ago", "3 h ago", "2 days ago" */
function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

/**
 * The 🔔 with the red unread number. Shown only when logged in (Navbar).
 * Loads again every 30 s, when you change page, and when you come back to the browser tab.
 */
export default function NotificationBell() {
  const [data, setData] = useState({ unread: 0, items: [] })
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  const load = useCallback(() => {
    fetchNotifications().then(setData).catch(() => {}) // a missed poll is fine: the next one tries again
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load, location.pathname])

  // close on a click outside the panel, or on Escape
  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openItem = async (n) => {
    setOpen(false)
    if (!n.read) {
      setData((d) => ({ unread: Math.max(0, d.unread - 1), items: d.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }))
      markNotificationRead(n.id).catch(() => {})
    }
    if (n.link) navigate(n.link)
  }

  const readAll = async () => {
    await markAllNotificationsRead().catch(() => {})
    load()
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label={data.unread ? `Notifications, ${data.unread} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <BellIcon />
        {data.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:top-12 sm:right-0 sm:w-96 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white">Notifications</h2>
            {data.unread > 0 && (
              <button type="button" onClick={readAll} className="py-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                Mark all as read
              </button>
            )}
          </div>
          {data.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {data.items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => openItem(n)}
                    className={'flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 '
                      + (n.read ? '' : 'bg-brand-50/60 dark:bg-slate-800/60')}>
                    <span className="text-xl" aria-hidden="true">{kindEmoji[n.kind] ?? '🔔'}</span>
                    <span className="min-w-0 flex-1">
                      <span className={'block text-sm text-slate-900 dark:text-white ' + (n.read ? '' : 'font-semibold')}>{n.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600 dark:text-slate-400">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="unread" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
