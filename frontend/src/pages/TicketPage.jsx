import { useSelector } from 'react-redux'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'

import { fetchBooking, qrImageUrl, toTicket } from '../api/bookings'

import { Notice } from '../components/auth/AuthCard'
import TicketStatusBadge from '../components/tickets/TicketStatusBadge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { ArrowLeftIcon, CalendarIcon, MapPinIcon, TicketIcon } from '../components/ui/icons'
import { Skeleton } from '../components/ui/Loader'
import useAsync, { describeError } from '../hooks/useAsync'
import { selectStudent } from '../store/studentSlice'
import { formatLongDate, formatPrice, formatTime, gradientFor } from '../utils/format'

/** The e-ticket with the QR code that volunteers scan at the gate (sketch 4 -> "Show QR ticket"). */
export default function TicketPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const student = useSelector(selectStudent)
  const { data, loading, error } = useAsync(() => fetchBooking(id), [id])

  if (loading) return <Skeleton className="mx-auto h-96 max-w-3xl" />
  if (error) {
    return <EmptyState title="Ticket not found" message={describeError(error).message}
      action={<Button to="/my-tickets" variant="secondary">My tickets</Button>} />
  }
  const ticket = toTicket(data)
  if (ticket.status === 'HELD') return <Navigate to={`/checkout/${ticket.id}`} replace /> // not paid yet: no ticket

  const cancelled = ticket.status === 'CANCELLED' || ticket.status === 'EXPIRED'

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/my-tickets" className="mb-6 inline-flex items-center gap-2 py-1 text-sm font-medium text-slate-600 hover:text-slate-900 print:hidden dark:text-slate-400 dark:hover:text-white">
        <ArrowLeftIcon className="h-4 w-4" /> My tickets
      </Link>

      {params.get('new') && (
        <div className="mb-6 print:hidden">
          <Notice tone="success">🎉 Booking confirmed! Show this QR code at the gate. A copy was sent to {student.email}.</Notice>
        </div>
      )}

      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className={`bg-gradient-to-r ${gradientFor(ticket.clubSlug)} px-6 py-5 text-white`}>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">{ticket.clubName}</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{ticket.title}</h1>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <p className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
              <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              <span>{formatLongDate(ticket.startTime)}<br /><span className="text-sm text-slate-500">{formatTime(ticket.startTime)}</span></span>
            </p>
            <p className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <MapPinIcon className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" /> {ticket.venue}
            </p>
            <p className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <TicketIcon className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              Admits <strong>{ticket.quantity}</strong> · {formatPrice(ticket.amount)}
            </p>
            <dl className="grid grid-cols-2 gap-3 border-t border-dashed border-slate-300 pt-4 text-sm dark:border-slate-700">
              <div><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900 dark:text-white">{student.name}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd><TicketStatusBadge status={ticket.status} /></dd></div>
            </dl>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className={`rounded-2xl bg-white p-3 ring-1 ring-slate-200 ${cancelled ? 'opacity-25 grayscale' : ''}`}>
              {/* white box on purpose: scanners need dark squares on a light background, even in dark mode */}
              {/* drawn by the server (ZXing); it holds only the random ticket code */}
              <img src={qrImageUrl(ticket.id)} width={168} height={168} alt={`QR code for ticket ${ticket.code}`} />
            </div>
            <p className="font-mono text-sm font-semibold tracking-wider text-slate-700 dark:text-slate-300">{ticket.code}</p>
            {cancelled && <p className="text-sm font-semibold text-red-600">This ticket is not valid ({ticket.status.toLowerCase()})</p>}
            {ticket.status === 'ATTENDED' && (
              <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">✓ Used at the gate, {formatTime(ticket.checkedInAt)}</p>
            )}
          </div>
        </div>
      </article>

      <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
        {!cancelled && <Button onClick={() => window.print()}>Print / save as PDF</Button>}
        <Button to="/my-tickets" variant="ghost">All my tickets</Button>
      </div>
    </div>
  )
}
