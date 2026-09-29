import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import { cancelBooking, fetchMyBookings, toTicket } from '../api/bookings'
import { fetchMyFeedback, giveFeedback } from '../api/feedback'
import EventPoster from '../components/events/EventPoster'
import TicketStatusBadge from '../components/tickets/TicketStatusBadge'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { TextAreaField } from '../components/ui/FormField'
import { Skeleton } from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import { StarInput, Stars } from '../components/ui/StarRating'
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

function TicketRow({ ticket, feedback, onCancel, onRate }) {
  const held = ticket.status === 'HELD'
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <EventPoster clubSlug={ticket.clubSlug} tags={ticket.tags} className="h-24 w-full shrink-0 rounded-xl sm:w-32" emojiSize="text-3xl" />
      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{ticket.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {formatShortDate(ticket.startTime)} · {ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''} · {formatPrice(ticket.amount)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          {feedback?.rating && <Stars value={feedback.rating} className="text-sm" />}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {held && <Button to={`/checkout/${ticket.id}`} size="sm">Pay now</Button>}
        {['CONFIRMED', 'ATTENDED'].includes(ticket.status) && <Button to={`/tickets/${ticket.id}`} size="sm">Show QR ticket</Button>}
        {ticket.canCancel && <Button variant="secondary" size="sm" onClick={() => onCancel(ticket)}>Cancel</Button>}
        {feedback && (
          <Button variant={feedback.rating ? 'ghost' : 'primary'} size="sm" onClick={() => onRate(ticket, feedback)}>
            {feedback.rating ? 'Edit rating' : '⭐ Rate this event'}
          </Button>
        )}
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

  // events I attended and that are over: they can be rated (Phase 7)
  const { data: feedbackList } = useAsync(fetchMyFeedback, [reload])
  const feedbackFor = Object.fromEntries((feedbackList ?? []).map((f) => [f.bookingId, f]))
  const unrated = (feedbackList ?? []).filter((f) => !f.rating).length
  const [toRate, setToRate] = useState(null) // { ticket, rating, comment }

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

  const saveRating = async () => {
    setBusy(true)
    try {
      await giveFeedback(toRate.ticket.id, toRate.rating, toRate.comment)
      dispatch(notify(`Thanks! Your rating for ${toRate.ticket.title} was saved.`, 'success'))
      setToRate(null)
      setReload((n) => n + 1)
    } catch (e) {
      dispatch(notify(describeError(e).message, 'error'))
    } finally {
      setBusy(false)
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

      {unrated > 0 && active !== 'past' && (
        <button type="button" onClick={() => setActive('past')}
          className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          ⭐ How was it? You can rate {unrated} event{unrated > 1 ? 's' : ''} you attended. <strong>Rate now →</strong>
        </button>
      )}

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
          {shown.map((t) => (
            <TicketRow key={t.id} ticket={t} feedback={feedbackFor[t.id]} onCancel={setToCancel}
              onRate={(ticket, f) => setToRate({ ticket, rating: f.rating ?? 0, comment: f.comment ?? '' })} />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(toRate)}
        onClose={() => setToRate(null)}
        title={toRate ? `How was ${toRate.ticket.title}?` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToRate(null)}>Later</Button>
            <Button onClick={saveRating} disabled={busy || !toRate?.rating}>{busy ? 'Saving…' : 'Save rating'}</Button>
          </>
        }
      >
        {toRate && (
          <div className="space-y-4">
            <StarInput value={toRate.rating} onChange={(rating) => setToRate((r) => ({ ...r, rating }))} />
            <TextAreaField id="rate-comment" label="Comment (optional)" rows={3} maxLength={1000}
              hint="The organizers see your comment without your name."
              value={toRate.comment} onChange={(e) => setToRate((r) => ({ ...r, comment: e.target.value }))} />
          </div>
        )}
      </Modal>

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
