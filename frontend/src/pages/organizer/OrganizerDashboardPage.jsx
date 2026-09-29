import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'

import { Notice } from '../../components/auth/AuthCard'
import EventStatusBadge from '../../components/organizer/EventStatusBadge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import StatCard from '../../components/ui/StatCard'
import { notify } from '../../store/notificationsSlice'
import { selectClub, selectClubEvents, submitEvent } from '../../store/organizerSlice'
import { formatMoney, formatShortDate } from '../../utils/format'

function EventRow({ event, onSubmit }) {
  const booked = event.totalSeats - event.availableSeats
  const percent = Math.round((booked / event.totalSeats) * 100)
  const sentBack = event.status === 'DRAFT' && Boolean(event.reviewNote)

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white">{event.title}</h3>
            <EventStatusBadge status={event.status} sentBack={sentBack} />
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{formatShortDate(event.startTime)} · {event.venue}</p>
          {event.status === 'PUBLISHED' && (
            <div className="mt-2 flex items-center gap-3">
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-brand-600 dark:bg-brand-400" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-xs text-slate-500">{booked}/{event.totalSeats} sold</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {event.status === 'PUBLISHED' && <Button to={`/events/${event.id}`} size="sm" variant="ghost">View</Button>}
          {event.status === 'PUBLISHED' && new Date(event.endTime ?? event.startTime) > new Date() && (
            <Button to={`/scanner?event=${event.id}`} size="sm" variant="ghost">Gate / live count</Button>
          )}
          {event.status === 'PUBLISHED' && new Date(event.endTime ?? event.startTime) <= new Date() && (
            <Button to={`/organizer/events/${event.id}/feedback`} size="sm" variant="ghost">⭐ Feedback</Button>
          )}
          {event.status !== 'PENDING_APPROVAL' && <Button to={`/organizer/events/${event.id}/edit`} size="sm" variant="secondary">Edit</Button>}
          {event.status === 'DRAFT' && <Button size="sm" onClick={() => onSubmit(event)}>Submit for approval</Button>}
        </div>
      </div>
      {sentBack && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
          <strong>Admin note:</strong> {event.reviewNote}
        </p>
      )}
    </Card>
  )
}

export default function OrganizerDashboardPage() {
  const dispatch = useDispatch()
  const club = useSelector(selectClub)
  const events = useSelector(selectClubEvents)
  const location = useLocation()
  const [toSubmit, setToSubmit] = useState(null)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(location.state?.message ?? null)

  const published = events.filter((e) => e.status === 'PUBLISHED')
  const sold = published.reduce((n, e) => n + e.totalSeats - e.availableSeats, 0)
  const revenue = published.reduce((n, e) => n + (e.totalSeats - e.availableSeats) * e.price, 0)
  const pending = events.filter((e) => e.status === 'PENDING_APPROVAL').length

  const order = { DRAFT: 0, PENDING_APPROVAL: 1, PUBLISHED: 2 }
  const sorted = [...events].sort((a, b) => order[a.status] - order[b.status] || a.startTime.localeCompare(b.startTime))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{club?.name}</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Your club's events, sales and approvals.</p>
        </div>
        <Button to="/organizer/events/new">+ Create event</Button>
      </div>

      {message && <Notice tone="success">{message}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published events" value={published.length} />
        <StatCard label="Tickets sold" value={sold} hint="Across published events" />
        <StatCard label="Money collected" value={formatMoney(revenue)} hint="Tickets × price" />
        <StatCard label="Waiting for approval" value={pending} />
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">Events</h2>
        {sorted.length === 0 ? (
          <EmptyState title="No events yet" action={<Button to="/organizer/events/new">Create your first event</Button>} />
        ) : (
          <div className="space-y-3">
            {sorted.map((e) => <EventRow key={e.id} event={e} onSubmit={setToSubmit} />)}
          </div>
        )}
      </section>

      <p className="text-xs text-slate-500">
        Live data from the backend. Only this club's organizers can see it (the server checks every call).{' '}
        <Link to="/admin/approvals" className="underline">Admin approval queue</Link>
      </p>

      <Modal
        open={Boolean(toSubmit)}
        onClose={() => setToSubmit(null)}
        title="Submit for approval?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToSubmit(null)}>Not yet</Button>
            <Button disabled={sending} onClick={async () => {
              setSending(true)
              try {
                // unwrap(): wait for the server; throws the rejectWithValue payload if it said no
                await dispatch(submitEvent(toSubmit.id)).unwrap()
                setMessage(`"${toSubmit.title}" was sent to the admin for approval.`)
              } catch (e) {
                dispatch(notify(e.message, 'error'))
              } finally {
                setSending(false)
                setToSubmit(null)
              }
            }}>{sending ? 'Sending…' : 'Submit'}</Button>
          </>
        }
      >
        {toSubmit && <>An admin will review <strong>{toSubmit.title}</strong>. You cannot edit it while it is waiting.</>}
      </Modal>
    </div>
  )
}
