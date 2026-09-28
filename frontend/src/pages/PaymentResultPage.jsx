import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useSearchParams } from 'react-router-dom'

import { fetchBooking, verifyPayment } from '../api/bookings'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Loader'
import { describeError } from '../hooks/useAsync'
import { cartCleared } from '../store/cartSlice'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const CHECKS = 15 // x 2 seconds = wait up to 30 seconds for the payment to be confirmed

/**
 * Where the payment page sends the student back:
 *   /payment/success?booking=12&session=cs_...   paid (maybe) - confirm, then show the ticket
 *   /payment/cancelled?booking=12                 they pressed Back / Cancel on the payment page
 *
 * "Success" only means "the student finished on the payment page". The SERVER decides when the
 * booking is CONFIRMED (Stripe's webhook, or our verify call), so we ask it until it says so.
 */
export default function PaymentResultPage({ result }) {
  const [params] = useSearchParams()
  const dispatch = useDispatch()
  const bookingId = params.get('booking')
  const session = params.get('session')
  const [state, setState] = useState({ phase: 'checking', booking: null, error: null })

  useEffect(() => {
    let active = true
    async function check() {
      try {
        let booking = null
        if (result === 'success' && session) {
          booking = await verifyPayment(session).catch(() => null) // ask Stripe directly; webhook may be slow
        }
        for (let i = 0; i < CHECKS && active; i++) {
          booking = booking?.status === 'CONFIRMED' ? booking : await fetchBooking(bookingId)
          if (result !== 'success' || booking.status !== 'HELD') break
          await wait(2000)
        }
        if (!active) return
        if (booking.status !== 'HELD') dispatch(cartCleared())
        setState({ phase: 'done', booking, error: null })
      } catch (e) {
        if (active) setState({ phase: 'done', booking: null, error: describeError(e).message })
      }
    }
    check()
    return () => {
      active = false
    }
  }, [bookingId, session, result, dispatch])

  const { phase, booking, error } = state
  if (phase === 'checking') {
    return (
      <div className="py-16 text-center">
        <Spinner label="Checking your payment" />
        <p className="text-slate-600 dark:text-slate-400">
          {result === 'success' ? 'Confirming your payment…' : 'Checking your booking…'}
        </p>
      </div>
    )
  }
  if (error || !booking) {
    return <EmptyState title="Could not check this booking" message={error}
      action={<Button to="/my-tickets" variant="secondary">My tickets</Button>} />
  }

  switch (booking.status) {
    case 'CONFIRMED':
      return <EmptyState title="🎉 Payment received. You are going!"
        message={`${booking.quantity} ticket${booking.quantity > 1 ? 's' : ''} for ${booking.event.title}. Show the QR code at the gate.`}
        action={<Button to={`/tickets/${booking.id}?new=1`}>Show my ticket</Button>} />
    case 'HELD':
      return result === 'success'
        ? <EmptyState title="Your payment is still being processed"
            message="This can take a minute. Your seats stay held meanwhile; My tickets will show CONFIRMED when it is done."
            action={<Button to="/my-tickets" variant="secondary">My tickets</Button>} />
        : <EmptyState title="Payment cancelled"
            message="No money was taken. Your seats are still held for a few minutes if you want to try again."
            action={<div className="flex flex-wrap justify-center gap-3">
              <Button to={`/checkout/${booking.id}`}>Back to checkout</Button>
              <Button to={`/events/${booking.event.id}`} variant="secondary">Back to event</Button>
            </div>} />
    default:
      return <EmptyState title={booking.status === 'EXPIRED' ? 'Your seat hold expired' : 'This booking was cancelled'}
        message="The seats are free again. If money was taken, it is refunded automatically."
        action={<Button to={`/events/${booking.event.id}`}>Book again</Button>} />
  }
}
