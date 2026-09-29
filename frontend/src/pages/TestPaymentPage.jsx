import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { completeTestPayment, fetchTestPayment } from '../api/bookings'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Loader'
import useAsync, { describeError } from '../hooks/useAsync'
import { formatPrice } from '../utils/format'

/**
 * DEVELOPMENT ONLY: stands in for Stripe's payment page when the backend has no Stripe keys.
 * "Pay" calls POST /api/payments/fake/{session}/complete, which runs the SAME confirm code as a
 * real Stripe webhook. With Stripe keys in .env, students go to Stripe instead and never see this.
 */
export default function TestPaymentPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { data: payment, loading, error } = useAsync(() => fetchTestPayment(sessionId), [sessionId])
  const [busy, setBusy] = useState(false)
  const [payError, setPayError] = useState(null)

  if (loading) return <Skeleton className="mx-auto h-80 max-w-md" />
  if (error) {
    return <EmptyState title="Payment page not found" message={describeError(error).message}
      action={<Button to="/my-tickets" variant="secondary">My tickets</Button>} />
  }

  const pay = async () => {
    setBusy(true)
    try {
      await completeTestPayment(sessionId)
      navigate(`/payment/success?booking=${payment.bookingId}`, { replace: true })
    } catch (e) {
      setPayError(describeError(e).message)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="overflow-hidden">
        <div className="bg-amber-400 px-6 py-3 text-center text-sm font-bold uppercase tracking-wide text-slate-900">
          Test payment · no real money
        </div>
        <div className="space-y-5 p-6">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Paying for</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{payment.eventTitle}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{payment.quantity} ticket{payment.quantity > 1 ? 's' : ''}</p>
          </div>
          <p className="text-4xl font-extrabold text-slate-900 dark:text-white">{formatPrice(payment.amount)}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This page stands in for Stripe during development. Put <code>STRIPE_SECRET_KEY</code> in <code>.env</code> to
            use Stripe's real test checkout (card 4242 4242 4242 4242).
          </p>
          {payError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">{payError}</p>}
          <Button size="lg" className="w-full" onClick={pay} disabled={busy || payment.status !== 'PENDING'}>
            {busy ? 'Paying…' : payment.status === 'PENDING' ? `Pay ${formatPrice(payment.amount)} (test)` : `Payment ${payment.status.toLowerCase()}`}
          </Button>
          <Button variant="ghost" className="w-full" disabled={busy}
            onClick={() => navigate(`/payment/cancelled?booking=${payment.bookingId}`, { replace: true })}>
            Cancel payment
          </Button>
        </div>
      </Card>
    </div>
  )
}
