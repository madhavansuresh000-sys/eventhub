import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { fetchEvent } from '../api/events'
import { acceptOffer, joinWaitlist, leaveWaitlist } from '../api/waitlist'
import { Notice } from '../components/auth/AuthCard'
import EventPoster from '../components/events/EventPoster'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { SelectField } from '../components/ui/FormField'
import { Skeleton } from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import useAsync, { describeError } from '../hooks/useAsync'
import useCountdown, { formatClock } from '../hooks/useCountdown'
import { seatsHeld } from '../store/cartSlice'
import { notify } from '../store/notificationsSlice'
import { loadWaitlist, selectOpenWaitlist, selectWaitlistState } from '../store/studentSlice'
import { formatPrice, formatShortDate } from '../utils/format'

const seatOptions = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} seat${i ? 's' : ''}` }))

/** Shown when you arrive from "Join waitlist" on a sold-out event (/waitlist?event=6). */
function JoinCard({ eventId, open }) {
  const dispatch = useDispatch()
  const { data: event, loading, error } = useAsync(() => fetchEvent(eventId), [eventId])
  const [quantity, setQuantity] = useState('1')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  if (loading) return <Skeleton className="h-40 w-full" />
  if (error) return null
  if (open.some((w) => w.event.id === event.id)) {
    return <Notice tone="success">You are on the waitlist for <strong>{event.title}</strong> (see below).</Notice>
  }
  if (!event.soldOut) {
    return <Notice><strong>{event.title}</strong> still has seats. <Link to={`/events/${event.id}`} className="font-semibold underline">Book directly</Link>.</Notice>
  }

  const join = async () => {
    setBusy(true)
    setProblem(null)
    try {
      const entry = await joinWaitlist(event.id, Number(quantity))
      dispatch(notify(entry.status === 'OFFERED'
        ? `Good news: seats of ${event.title} are free right now and kept for you!`
        : `You joined the waitlist for ${event.title}. You are #${entry.position}.`, 'success'))
      dispatch(loadWaitlist())
    } catch (e) {
      setProblem(describeError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Join the waitlist for {event.title}?</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            It is sold out. When seats come back, they are kept for the first student in the queue for 30 minutes.
          </p>
        </div>
        <SelectField id="wl-qty" label="Seats" options={seatOptions} placeholder="How many?" className="sm:w-36"
          value={quantity} onChange={(e) => setQuantity(e.target.value || '1')} />
        <Button onClick={join} disabled={busy}>{busy ? 'Joining…' : 'Join waitlist'}</Button>
      </div>
      {problem && <div className="mt-4"><Notice tone="error">{problem}</Notice></div>}
    </Card>
  )
}

/** A seat offer with its 30-minute countdown (counted from the SERVER's secondsLeft). */
function OfferCard({ entry, onAccept, onDecline, busy }) {
  const dispatch = useDispatch()
  const [endsAt] = useState(() => Date.now() + entry.secondsLeft * 1000) // fixed once, like the checkout timer
  const left = useCountdown(endsAt)

  useEffect(() => {
    if (left === 0) dispatch(loadWaitlist()) // time is up: the server has moved it on
  }, [left, dispatch])

  const total = Number(entry.event.price) * entry.quantity
  return (
    <Card className="border-2 border-green-500 p-4 dark:border-green-600">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <EventPoster clubSlug={entry.event.clubSlug} tags={entry.event.tags} className="h-24 w-full shrink-0 rounded-xl sm:w-32" emojiSize="text-3xl" />
        <div className="flex-1">
          <Badge color="green">🎉 SEATS KEPT FOR YOU</Badge>
          <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{entry.event.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {entry.quantity} seat{entry.quantity > 1 ? 's' : ''} · {formatPrice(total)} · {formatShortDate(entry.event.startTime)}
          </p>
          <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-400" aria-live="polite">
            Accept within <span className="font-mono text-base">{formatClock(left)}</span> or they go to the next student.
          </p>
        </div>
        <div className="flex gap-2 sm:flex-col">
          <Button onClick={() => onAccept(entry)} disabled={busy || left === 0}>Accept seats</Button>
          <Button variant="ghost" size="sm" onClick={() => onDecline(entry)} disabled={busy}>No thanks</Button>
        </div>
      </div>
    </Card>
  )
}

function WaitingCard({ entry, onLeave }) {
  const ahead = entry.position - 1
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <EventPoster clubSlug={entry.event.clubSlug} tags={entry.event.tags} className="h-24 w-full shrink-0 rounded-xl sm:w-32" emojiSize="text-3xl" />
      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{entry.event.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">{formatShortDate(entry.event.startTime)} · {entry.event.venue}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge color="amber">WAITLIST #{entry.position}</Badge>
          <span className="text-xs text-slate-500">
            {entry.quantity} seat{entry.quantity > 1 ? 's' : ''} ·{' '}
            {ahead === 0 ? 'You are next in line!' : `${ahead} student${ahead > 1 ? 's' : ''} ahead of you`}
          </span>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={() => onLeave(entry)}>Leave waitlist</Button>
    </Card>
  )
}

const historyText = { BOOKED: 'Booked ✅', EXPIRED: 'Offer ran out', LEFT: 'You left' }

export default function WaitlistPage() {
  const [params] = useSearchParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { waitlist, loading, error } = useSelector(selectWaitlistState)
  const open = useSelector(selectOpenWaitlist)
  const [toLeave, setToLeave] = useState(null)
  const [busy, setBusy] = useState(false)
  const eventId = params.get('event')

  useEffect(() => {
    dispatch(loadWaitlist())
  }, [dispatch])

  const offers = open.filter((w) => w.status === 'OFFERED')
  const waiting = open.filter((w) => w.status === 'WAITING')
  const history = waitlist.filter((w) => !open.includes(w))

  const accept = async (entry) => {
    setBusy(true)
    try {
      const booking = await acceptOffer(entry.id)
      if (booking.status === 'CONFIRMED') {
        navigate(`/tickets/${booking.id}?new=1`) // free event: the ticket is ready
      } else {
        dispatch(seatsHeld(booking)) // navbar countdown
        navigate(`/checkout/${booking.id}`) // paid event: 10 minutes to pay, as usual
      }
    } catch (e) {
      dispatch(notify(describeError(e).message, 'error'))
      dispatch(loadWaitlist())
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    const entry = toLeave
    setBusy(true)
    try {
      await leaveWaitlist(entry.id)
      dispatch(notify(entry.status === 'OFFERED'
        ? `The seats for ${entry.event.title} will go to the next student.`
        : `You left the waitlist for ${entry.event.title}.`))
    } catch (e) {
      dispatch(notify(describeError(e).message, 'error'))
    } finally {
      setBusy(false)
      setToLeave(null)
      dispatch(loadWaitlist())
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My waitlist</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">First come, first served: #1 gets the next free seats, kept for 30 minutes.</p>
      </div>

      {eventId && <JoinCard eventId={eventId} open={open} />}

      {error && <Notice tone="error">{error}</Notice>}

      {loading && waitlist.length === 0 ? (
        <Skeleton className="h-32 w-full" />
      ) : open.length === 0 ? (
        <EmptyState title="You are not on any waitlist" message="When an event is full, you can join its waitlist from the event page."
          action={<Button to="/events" variant="secondary">Browse events</Button>} />
      ) : (
        <div className="space-y-4">
          {offers.map((w) => <OfferCard key={w.id} entry={w} busy={busy} onAccept={accept} onDecline={setToLeave} />)}
          {waiting.map((w) => <WaitingCard key={w.id} entry={w} onLeave={setToLeave} />)}
        </div>
      )}

      {history.length > 0 && (
        <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <summary className="cursor-pointer py-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Earlier waitlists ({history.length})
          </summary>
          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {history.map((w) => (
              <li key={w.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-slate-800 dark:text-slate-200">{w.event.title}</span>
                <span className="text-slate-500">
                  {historyText[w.status]}
                  {w.status === 'BOOKED' && w.bookingId && (
                    <> · <Link to={`/tickets/${w.bookingId}`} className="font-semibold text-brand-600 underline dark:text-brand-400">ticket</Link></>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Modal
        open={Boolean(toLeave)}
        onClose={() => setToLeave(null)}
        title={toLeave?.status === 'OFFERED' ? 'Give the seats away?' : 'Leave the waitlist?'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToLeave(null)}>{toLeave?.status === 'OFFERED' ? 'Keep them' : 'Stay in line'}</Button>
            <Button variant="danger" onClick={leave} disabled={busy}>{toLeave?.status === 'OFFERED' ? 'Give away' : 'Leave'}</Button>
          </>
        }
      >
        {toLeave && (toLeave.status === 'OFFERED'
          ? <>The seats kept for you for <strong>{toLeave.event.title}</strong> will go to the next student in the queue.</>
          : <>You will lose your place (#{toLeave.position}) for <strong>{toLeave.event.title}</strong>.</>)}
      </Modal>
    </div>
  )
}
