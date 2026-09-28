import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import { TextAreaField } from '../../components/ui/FormField'
import { Skeleton } from '../../components/ui/Loader'
import Modal from '../../components/ui/Modal'
import { approveEvent, loadApprovalQueue, rejectEvent, selectApprovalQueue, selectQueueLoad } from '../../store/adminSlice'
import { notify } from '../../store/notificationsSlice'
import { daysUntil, emojiFor, formatPrice, formatShortDate, formatTimeRange, gradientFor } from '../../utils/format'

const REASON_MAX = 500 // same limit as the backend's ReviewRequest

/** Ready-made reasons, so the admin does not type the same thing every time. */
const quickReasons = [
  'Please add the speaker or guest names.',
  'The venue is already booked at this time. Please pick another slot.',
  'Please give a clearer description of what students will do.',
]

function StartsIn({ iso }) {
  const days = daysUntil(iso)
  if (days < 0) return <Badge color="red">Date already passed</Badge>
  if (days <= 7) return <Badge color="amber">{days === 0 ? 'Starts today' : `Starts in ${days} day${days === 1 ? '' : 's'}`}</Badge>
  return <Badge>In {days} days</Badge>
}

function QueueCard({ event, onApprove, onSendBack }) {
  return (
    <Card className="overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${gradientFor(event.club.slug)}`} />
      <div className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-3xl ${gradientFor(event.club.slug)}`}
            aria-hidden="true"
          >
            {emojiFor(event.tags)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{event.title}</h2>
              <StartsIn iso={event.startTime} />
            </div>
            <p className="text-sm text-slate-500">
              {event.club.name}
            </p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{event.description}</p>

            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div><dt className="inline text-slate-500">When: </dt><dd className="inline text-slate-800 dark:text-slate-200">{formatShortDate(event.startTime)}</dd></div>
              <div><dt className="inline text-slate-500">Time: </dt><dd className="inline text-slate-800 dark:text-slate-200">{formatTimeRange(event.startTime, event.endTime)}</dd></div>
              <div><dt className="inline text-slate-500">Where: </dt><dd className="inline text-slate-800 dark:text-slate-200">{event.venue}</dd></div>
              <div><dt className="inline text-slate-500">Seats × price: </dt><dd className="inline text-slate-800 dark:text-slate-200">{event.totalSeats} × {formatPrice(event.price)}</dd></div>
            </dl>

            <div className="mt-3 flex flex-wrap gap-1">
              {event.tags.map((t) => <Badge key={t} color="brand">#{t}</Badge>)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="secondary" onClick={() => onSendBack(event)}>Send back</Button>
          <Button onClick={() => onApprove(event)}>Approve</Button>
        </div>
      </div>
    </Card>
  )
}

function SendBackModal({ event, onClose, onConfirm, busy }) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  const error = !reason.trim()
    ? 'Tell the organizer what to fix'
    : reason.length > REASON_MAX ? `Keep it under ${REASON_MAX} characters` : ''
  const showError = touched && error

  const submit = () => {
    setTouched(true)
    if (!error) onConfirm(reason)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Send back "${event.title}"?`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Send back'}</Button>
        </>
      }
    >
      <p className="mb-3">It goes back to <strong>Draft</strong>. {event.club.name} sees your note and can fix and submit again.</p>
      <TextAreaField
        id="review-reason"
        label="Reason for the organizer"
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onBlur={() => setTouched(true)}
        error={showError ? error : ''}
        hint={`${reason.length}/${REASON_MAX}`}
        autoFocus
      />
      <p className="mt-3 text-xs font-semibold text-slate-500">Quick reasons</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {quickReasons.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className="rounded-full border border-slate-300 px-3 py-1 text-left text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {r}
          </button>
        ))}
      </div>
    </Modal>
  )
}

export default function ApprovalQueuePage() {
  const dispatch = useDispatch()
  const queue = useSelector(selectApprovalQueue)
  const { status, error } = useSelector(selectQueueLoad)
  const [toApprove, setToApprove] = useState(null)
  const [toSendBack, setToSendBack] = useState(null)
  const [busy, setBusy] = useState(false)

  // always ask the server: an organizer may have submitted something since last time
  useEffect(() => {
    dispatch(loadApprovalQueue())
  }, [dispatch])

  /** Runs approve / send back, waits for the server, then shows a toast (green or red). */
  const decide = async (thunkAction, successText, close) => {
    setBusy(true)
    try {
      await dispatch(thunkAction).unwrap()
      dispatch(notify(successText))
    } catch (e) {
      dispatch(notify(e.message, 'error'))
      dispatch(loadApprovalQueue()) // someone else may have reviewed it already: refresh the list
    } finally {
      setBusy(false)
      close()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Approval queue</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Events that clubs sent for review. The one that starts soonest is at the top.
        </p>
      </div>

      {status === 'failed' ? (
        <EmptyState title="Could not load the queue" message={error}
          action={<Button onClick={() => dispatch(loadApprovalQueue())}>Try again</Button>} />
      ) : status === 'loading' && queue.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : queue.length === 0 ? (
        <EmptyState
          title="All caught up"
          message="No events are waiting. New ones appear here when an organizer presses Submit for approval."
          action={<Button to="/organizer" variant="secondary">Open the organizer area</Button>}
        />
      ) : (
        <div className="space-y-4">
          {queue.map((e) => <QueueCard key={e.id} event={e} onApprove={setToApprove} onSendBack={setToSendBack} />)}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Live data from the backend (POST /api/events/{'{id}'}/approve and /reject). Admins only (the server checks every call).
      </p>

      <Modal
        open={Boolean(toApprove)}
        onClose={() => setToApprove(null)}
        title="Approve and publish?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToApprove(null)}>Cancel</Button>
            <Button disabled={busy} onClick={() => decide(
              approveEvent(toApprove),
              `"${toApprove.title}" is now published. Students can book it.`,
              () => setToApprove(null),
            )}>{busy ? 'Approving…' : 'Approve'}</Button>
          </>
        }
      >
        {toApprove && <><strong>{toApprove.title}</strong> by {toApprove.club.name} will appear on the Events page right away.</>}
      </Modal>

      {toSendBack && (
        <SendBackModal
          event={toSendBack}
          busy={busy}
          onClose={() => setToSendBack(null)}
          onConfirm={(reason) => decide(
            rejectEvent({ event: toSendBack, reason }),
            `"${toSendBack.title}" was sent back to ${toSendBack.club.name} with your note.`,
            () => setToSendBack(null),
          )}
        />
      )}
    </div>
  )
}
