import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { fetchEvent } from '../api/events'
import { Notice } from '../components/auth/AuthCard'
import EventPoster from '../components/events/EventPoster'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Loader'
import useAsync, { describeError } from '../hooks/useAsync'
import useCountdown, { formatClock } from '../hooks/useCountdown'
import { cartCleared, HOLD_MINUTES, seatsHeld, selectCart } from '../store/cartSlice'
import { selectStudent, ticketsBooked } from '../store/studentSlice'
import { formatPrice, formatShortDate } from '../utils/format'

/** The event fields a ticket needs, plus how many seats. This is what goes into the cart. */
const cartItemFor = (event, quantity) => ({
  eventId: event.id, title: event.title, clubName: event.club.name, clubSlug: event.club.slug,
  venue: event.venue, startTime: event.startTime, tags: event.tags, price: Number(event.price), quantity,
})
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const paymentMethods = [
  { value: 'upi', label: 'UPI', hint: 'GPay, PhonePe, Paytm' },
  { value: 'card', label: 'Debit / credit card', hint: 'Visa, Mastercard, RuPay' },
  { value: 'venue', label: 'Pay at the venue', hint: 'Cash or UPI at the gate' },
]

function HoldTimer({ secondsLeft }) {
  const urgent = secondsLeft <= 60
  return (
    <div
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
      className={
        'flex items-center justify-between rounded-xl border px-4 py-3 ' +
        (urgent
          ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
          : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200')
      }
    >
      <span className="text-sm font-medium">
        {urgent ? 'Hurry! Your seats are released soon' : 'Your seats are held for you'}
      </span>
      <span className="font-mono text-2xl font-bold tabular-nums">{formatClock(secondsLeft)}</span>
    </div>
  )
}

function Checkout({ event, quantity }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const student = useSelector(selectStudent)
  const cart = useSelector(selectCart)
  const [method, setMethod] = useState('upi')
  const [paying, setPaying] = useState(false)

  // Same event and quantity already in the cart? Keep that hold (and its timer). Otherwise hold new seats.
  const held = cart.item?.eventId === event.id && cart.item.quantity === quantity
  useEffect(() => {
    if (!held && !paying) dispatch(seatsHeld(cartItemFor(event, quantity)))
  }, [held, paying, event, quantity, dispatch])
  const secondsLeft = useCountdown(cart.holdEndsAt ?? 0)

  const free = Number(event.price) === 0
  const total = Number(event.price) * quantity

  const pay = async () => {
    setPaying(true)
    await wait(1200) // Phase 6: POST /api/bookings, then the payment gateway
    // the action creator's "prepare" made the ticket id; dispatch returns the action
    const { payload: ticket } = dispatch(ticketsBooked(cart.item, quantity))
    dispatch(cartCleared())
    navigate(`/tickets/${ticket.id}?new=1`)
  }

  if (!held && !paying) return <Skeleton className="h-96 w-full" />

  if (secondsLeft === 0 && !paying) {
    return (
      <EmptyState
        title="Your seat hold expired"
        message={`We held ${quantity} seat${quantity > 1 ? 's' : ''} for ${HOLD_MINUTES} minutes. They are now free for other students.`}
        action={
          <div className="flex gap-3">
            <Button onClick={() => dispatch(seatsHeld(cartItemFor(event, quantity)))}>Hold seats again</Button>
            <Button to={`/events/${event.id}`} variant="secondary">Back to event</Button>
          </div>
        }
      />
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <HoldTimer secondsLeft={secondsLeft} />

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your details</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900 dark:text-white">{student.name}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-900 dark:text-white">{student.email}</dd></div>
            <div><dt className="text-slate-500">Department</dt><dd className="font-medium text-slate-900 dark:text-white">{student.department}, Year {student.year}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">Your tickets are sent to this email.</p>
        </Card>

        {!free && (
          <Card as="fieldset" className="p-6">
            <legend className="sr-only">Payment method</legend>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Payment method</h2>
            <div className="mt-4 space-y-3">
              {paymentMethods.map((m) => (
                <label key={m.value}
                  className={'flex cursor-pointer items-center gap-3 rounded-lg border p-3 ' +
                    (method === m.value ? 'border-brand-500 bg-brand-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700')}>
                  <input type="radio" name="method" value={m.value} checked={method === m.value}
                    onChange={() => setMethod(m.value)} className="h-4 w-4 accent-brand-600" />
                  <span>
                    <span className="block font-medium text-slate-900 dark:text-white">{m.label}</span>
                    <span className="block text-xs text-slate-500">{m.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>
        )}

        <Notice>Demo checkout: no money is taken. Real booking and payment arrive in Phase 6.</Notice>
      </div>

      <aside>
        <Card className="overflow-hidden lg:sticky lg:top-24">
          <EventPoster clubSlug={event.club.slug} tags={event.tags} className="h-28" emojiSize="text-4xl" />
          <div className="space-y-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">{event.club.name}</p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{event.title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{formatShortDate(event.startTime)} · {event.venue}</p>
            </div>
            <div className="space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">{quantity} × {formatPrice(event.price)}</span>
                <span className="text-slate-900 dark:text-white">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Booking fee</span>
                <span className="text-slate-900 dark:text-white">Free</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold dark:border-slate-800">
                <span className="text-slate-900 dark:text-white">Total</span>
                <span className="text-slate-900 dark:text-white">{formatPrice(total)}</span>
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={pay} disabled={paying}>
              {paying ? 'Confirming…' : free ? 'Confirm free booking' : `Pay ${formatPrice(total)}`}
            </Button>
            <Link to={`/events/${event.id}`} className="block text-center text-sm text-slate-500 hover:underline">Change tickets</Link>
          </div>
        </Card>
      </aside>
    </div>
  )
}

export default function CheckoutPage() {
  const { eventId } = useParams()
  const [params] = useSearchParams()
  const { data: event, loading, error } = useAsync(() => fetchEvent(eventId), [eventId])

  if (loading) return <Skeleton className="h-96 w-full" />
  if (error) {
    return <EmptyState title="Could not start checkout" message={describeError(error).message}
      action={<Button to="/events" variant="secondary">Browse events</Button>} />
  }
  if (event.soldOut) {
    return <EmptyState title={`${event.title} is sold out`} message="Join the waitlist and we will offer you a seat if someone cancels."
      action={<Button to={`/waitlist?event=${event.id}`}>Join waitlist</Button>} />
  }

  const asked = Number(params.get('qty')) || 1
  const quantity = Math.max(1, Math.min(asked, 10, event.availableSeats))

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-slate-900 dark:text-white">Checkout</h1>
      <Checkout event={event} quantity={quantity} />
    </div>
  )
}
