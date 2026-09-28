import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { fetchEvent } from '../api/events'
import EventPoster from '../components/events/EventPoster'
import SeatsBar from '../components/events/SeatsBar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { ArrowLeftIcon, CalendarIcon, MapPinIcon, UsersIcon } from '../components/ui/icons'
import { Skeleton } from '../components/ui/Loader'
import useAsync, { describeError } from '../hooks/useAsync'
import { formatLongDate, formatPrice, formatTimeRange } from '../utils/format'

const MAX_TICKETS = 10

function Stepper({ value, max, onChange }) {
  const btn =
    'grid h-9 w-9 place-items-center rounded-lg border border-slate-300 text-lg font-semibold ' +
    'hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800'
  return (
    <div className="flex items-center gap-3">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="One ticket less">−</button>
      <span className="w-6 text-center text-lg font-bold text-slate-900 dark:text-white" aria-live="polite">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="One ticket more">+</button>
    </div>
  )
}

function BookingBox({ event }) {
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const max = Math.min(event.availableSeats, MAX_TICKETS)
  const total = Number(event.price) * qty

  return (
    <Card className="space-y-5 p-6 lg:sticky lg:top-24">
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatPrice(event.price)}</span>
        {Number(event.price) > 0 && <span className="text-sm text-slate-500">per ticket</span>}
      </div>

      <SeatsBar available={event.availableSeats} total={event.totalSeats} />

      {event.soldOut ? (
        <>
          <Badge color="red">FULL</Badge>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            All seats are booked. Join the waitlist and we will offer you a seat if someone cancels.
          </p>
          <Button to={`/waitlist?event=${event.id}`} variant="secondary" size="lg" className="w-full">Join waitlist</Button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tickets</span>
            <Stepper value={qty} max={max} onChange={setQty} />
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">Total</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{formatPrice(total)}</span>
          </div>
          <Button size="lg" className="w-full" onClick={() => navigate(`/checkout/${event.id}?qty=${qty}`)}>
            Book now
          </Button>
          <p className="text-center text-xs text-slate-500">Your seats are held for 10 minutes while you pay.</p>
        </>
      )}
    </Card>
  )
}

function DetailsSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  )
}

export default function EventDetailsPage() {
  const { id } = useParams()
  const { data: event, loading, error } = useAsync(() => fetchEvent(id), [id])

  if (loading) return <DetailsSkeleton />
  if (error) {
    const { status, message } = describeError(error)
    return (
      <EmptyState
        title={status === 404 ? 'Event not found' : 'Could not load this event'}
        message={status === 404 ? 'It may not be published yet, or the link is wrong.' : message}
        action={<Button to="/events" variant="secondary">Browse all events</Button>}
      />
    )
  }

  return (
    <div>
      <Link to="/events" className="mb-6 inline-flex items-center gap-2 py-1 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeftIcon className="h-4 w-4" /> All events
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        <article className="lg:col-span-2">
          <EventPoster clubSlug={event.club.slug} tags={event.tags} className="h-56 rounded-2xl sm:h-72" emojiSize="text-7xl" />

          <Link to={`/clubs/${event.club.slug}`} className="mt-6 inline-block py-1 text-sm font-semibold uppercase tracking-wide text-brand-600 hover:underline dark:text-brand-400">
            {event.club.name}
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{event.title}</h1>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              <div>
                <dt className="sr-only">Date</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{formatLongDate(event.startTime)}</dd>
                <dd className="text-sm text-slate-600 dark:text-slate-400">{formatTimeRange(event.startTime, event.endTime)}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              <div>
                <dt className="sr-only">Venue</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{event.venue}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <UsersIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              <div>
                <dt className="sr-only">Organizer</dt>
                <dd className="font-medium text-slate-900 dark:text-white">Organized by {event.club.name}</dd>
              </div>
            </div>
          </dl>

          <h2 className="mt-8 text-xl font-bold text-slate-900 dark:text-white">About the event</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
            {event.description || 'More details coming soon.'}
          </p>

          {event.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {event.tags.map((t) => (
                <Link key={t} to={`/events?tag=${t}`}><Badge color="brand">#{t}</Badge></Link>
              ))}
            </div>
          )}
        </article>

        <aside>
          <BookingBox event={event} />
        </aside>
      </div>
    </div>
  )
}
