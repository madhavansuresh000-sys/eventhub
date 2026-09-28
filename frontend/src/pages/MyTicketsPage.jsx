import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import EventPoster from '../components/events/EventPoster'
import TicketStatusBadge from '../components/tickets/TicketStatusBadge'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { notify } from '../store/notificationsSlice'
import { selectTickets, selectWaitlist, ticketCancelled } from '../store/studentSlice'
import { formatShortDate } from '../utils/format'

const filters = [
  { key: 'upcoming', label: 'Upcoming', match: (t, now) => t.status === 'CONFIRMED' && new Date(t.startTime) >= now },
  { key: 'past', label: 'Past', match: (t, now) => t.status === 'ATTENDED' || (t.status === 'CONFIRMED' && new Date(t.startTime) < now) },
  { key: 'cancelled', label: 'Cancelled', match: (t) => t.status === 'CANCELLED' },
]

function TicketRow({ ticket, onCancel }) {
  const upcoming = ticket.status === 'CONFIRMED'
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <EventPoster clubSlug={ticket.clubSlug} tags={ticket.tags} className="h-24 w-full shrink-0 rounded-xl sm:w-32" emojiSize="text-3xl" />
      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{ticket.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {formatShortDate(ticket.startTime)} · {ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''}
        </p>
        <div className="mt-2"><TicketStatusBadge status={ticket.status} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ticket.status !== 'CANCELLED' && <Button to={`/tickets/${ticket.id}`} size="sm">Show QR ticket</Button>}
        {upcoming && <Button variant="secondary" size="sm" onClick={() => onCancel(ticket)}>Cancel</Button>}
        {ticket.certificateId && <Button to={`/certificates/${ticket.certificateId}`} size="sm" variant="secondary">Download certificate</Button>}
      </div>
    </Card>
  )
}

export default function MyTicketsPage() {
  const tickets = useSelector(selectTickets)
  const waitlist = useSelector(selectWaitlist)
  const dispatch = useDispatch()
  const [active, setActive] = useState('upcoming')
  const [toCancel, setToCancel] = useState(null)

  const now = new Date()
  const filter = filters.find((f) => f.key === active)
  const shown = tickets.filter((t) => filter.match(t, now)).sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My tickets</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Your bookings, QR tickets and certificates.</p>
        </div>
        {waitlist.length > 0 && (
          <Link to="/waitlist"><Badge color="amber">On {waitlist.length} waitlist{waitlist.length > 1 ? 's' : ''} →</Badge></Link>
        )}
      </div>

      <div className="flex gap-2" role="group" aria-label="Show tickets">
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

      {shown.length === 0 ? (
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
            <Button variant="danger" onClick={() => {
              dispatch(ticketCancelled(toCancel.id))
              dispatch(notify(`Booking for ${toCancel.title} cancelled.`))
              setToCancel(null)
            }}>Yes, cancel</Button>
          </>
        }
      >
        {toCancel && (
          <>Your {toCancel.quantity > 1 ? `${toCancel.quantity} seats` : 'seat'} for <strong>{toCancel.title}</strong> will go to the
            next student on the waitlist. This cannot be undone.</>
        )}
      </Modal>
    </div>
  )
}
