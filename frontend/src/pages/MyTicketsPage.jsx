import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import { cancelBooking, fetchMyBookings, toTicket } from '../api/bookings'
import EventPoster from '../components/events/EventPoster'
import TicketStatusBadge from '../components/tickets/TicketStatusBadge'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import useAsync, { describeError } from '../hooks/useAsync'
import { cartCleared } from '../store/cartSlice'
import { notify } from '../store/notificationsSlice'
import { loadWaitlist, selectOpenWaitlist } from '../store/studentSlice'
import { formatPrice, formatShortDate } from '../utils/format'

const filters = [
  { key: 'upcoming', label: 'Upcoming', match: (t, now) => ['CONFIRMED', 'HELD', 'ATTENDED'].includes(t.status) && new Date(t.startTime) >= now },
  { key: 'past', label: 'Past', match: (t, now) => ['CONFIRMED', 'ATTENDED'].includes(t.status) && new Date(t.startTime) < now },
  { key: 'cancelled', label: 'Cancelled', match: (t) => ['CANCELLED', 'EXPIRED'].includes(t.status) },
]

function TicketRow({ ticket, onCancel }) {
  const held = ticket.status === 'HELD'
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <EventPoster clubSlug={ticket.clubSlug} tags={ticket.tags} className="h-24 w-full shrink-0 rounded-xl sm:w-32" emojiSize="text-3xl" />
      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{ticket.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {formatShortDate(ticket.startTime)} · {ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''} · {formatPrice(ticket.amount)}
        </p>
        <div className="mt-2"><TicketStatusBadge status={ticket.status} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {held && <Button to={`/checkout/${ticket.id}`} size="sm">Pay now</Button>}
        {['CONFIRMED', 'ATTENDED'].includes(ticket.status) && <Button to={`/tickets/${ticket.id}`} size="sm">Show QR ticket</Button>}
        {ticket.canCancel && <Button variant="secondary" size="sm" onClick={() => onCancel(ticket)}>Cancel</Button>}
      </div>
    </Card>
  )
}

export default function MyTicketsPage() {
  const dispatch = useDispatch()
  const waitlist = useSelector(selectOpenWaitlist)
  const offers = waitlist.filter((w) => w.status === 'OFFERED').length
  const [reload, setReload] = useState(0)
  const { data, loading, error } = useAsync(fetchMyBookings, [reload])

  // reload the waitlist too: a cancel here may have freed seats for someone - or offers may be waiting for me
  useEffect(() => {
    dispatch(loadWaitlist())
  }, [dispatch, reload])
  const [active, setActive] = useState('upcoming')
  const [toCancel, setToCancel] = useState(null)
  const [busy, setBusy] = useState(false)

  const tickets = (data ?? []).map(toTicket)
  const now = new Date()
  const filter = filters.find((f) => f.key === active)
  const shown = tickets.filter((t) => filter.match(t, now)).sort((a, b) => a.startTime.localeCompare(b.startTime))

  const cancel = async () => {
    setBusy(true)
    try {
      await cancelBooking(toCancel.id)
      if (toCancel.status === 'HELD') dispatch(cartCleared())
      dispatch(notify(toCancel.status === 'CONFIRMED' && toCancel.amount > 0
        ? `Booking for ${toCancel.title} cancelled. ${formatPrice(toCancel.amount)} will be refunded.`
        : `Booking for ${toCancel.title} cancelled.`))
      setReload((n) => n + 1)
    } catch (e) {
      dispatch(notify(describeError(e).message, 'error'))
    } finally {
      setBusy(false)
      setToCancel(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My tickets</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Your bookings and QR tickets.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/certificates"><Badge color="brand">My certificates →</Badge></Link>
          {offers > 0 ? (
            <Link to="/waitlist"><Badge color="green">🎉 Seats kept for you - accept now →</Badge></Link>
          ) : waitlist.length > 0 && (
            <Link to="/waitlist"><Badge color="amber">On {waitlist.length} waitlist{waitlist.length > 1 ? 's' : ''} →</Badge></Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show tickets">
        {filters.map((f) => {
          const count = tickets.filter((t) => f.match(t, now)).length
          return (
            <button key={f.key} type="button" onClick={() => setActive(f.key)} aria-pressed={active === f.key}
              className={'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ' +
                (active === f.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')}>
              {f.label} ({count})
            </button>
          )
        })}
      </div>

      {loading && !data ? (
        <div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>
      ) : error ? (
        <EmptyState title="Could not load your tickets" message={describeError(error).message}
          action={<Button onClick={() => setReload((n) => n + 1)}>Try again</Button>} />
      ) : shown.length === 0 ? (
        <EmptyState title={`No ${filter.label.toLowerCase()} tickets`} message="Find something fun to attend!"
          action={<Button to="/events">Browse events</Button>} />
      ) : (
        <div className="space-y-4">
          {shown.map((t) => <TicketRow key={t.id} ticket={t} onCancel={setToCancel} />)}
        </div>
      )}

      <Modal
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        title="Cancel this booking?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToCancel(null)}>Keep it</Button>
            <Button variant="danger" onClick={cancel} disabled={busy}>{busy ? 'Cancelling…' : 'Yes, cancel'}</Button>
          </>
        }
      >
        {toCancel && (
          <>Your {toCancel.quantity > 1 ? `${toCancel.quantity} seats` : 'seat'} for <strong>{toCancel.title}</strong> go
            back on sale.{toCancel.status === 'CONFIRMED' && toCancel.amount > 0 && <> {formatPrice(toCancel.amount)} is refunded.</>} This cannot be undone.</>
        )}
      </Modal>
    </div>
  )
}
