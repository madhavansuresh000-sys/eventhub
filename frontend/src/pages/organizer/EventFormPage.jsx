import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { fetchTags } from '../../api/events'
import { Notice } from '../../components/auth/AuthCard'
import EventStatusBadge from '../../components/organizer/EventStatusBadge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import { TextAreaField, TextField } from '../../components/ui/FormField'
import useAsync from '../../hooks/useAsync'
import useForm from '../../hooks/useForm'
import { useOrganizerData } from '../../state/OrganizerDataContext'
import { maxLength, notNegative, required, wholeNumberBetween } from '../../utils/validation'

const MAX_TAGS = 5

/** Same rules as EventRequest + EventService on the backend, so errors show before sending. */
const rules = {
  title: [required('Title'), maxLength(150, 'Title')],
  description: [maxLength(5000, 'Description')],
  venue: [required('Venue'), maxLength(150, 'Venue')],
  startTime: [
    required('Start time'),
    (v) => (!v || new Date(v) > new Date() ? '' : 'Start time must be in the future'),
  ],
  endTime: [
    required('End time'),
    (v, all) => (!v || !all.startTime || new Date(v) > new Date(all.startTime) ? '' : 'End time must be after the start time'),
  ],
  totalSeats: [required('Total seats'), wholeNumberBetween(1, 10000, 'Total seats')],
  price: [required('Price'), notNegative('Price')],
  tags: [(v) => (v.length <= MAX_TAGS ? '' : `Choose at most ${MAX_TAGS} tags`)],
}

const empty = { title: '', description: '', venue: '', startTime: '', endTime: '', totalSeats: '', price: '0', tags: [] }

function TagPicker({ value, onChange, error }) {
  const { data: tags } = useAsync(fetchTags, [])
  const toggle = (t) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t])
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Tags <span className="font-normal text-slate-500">({value.length}/{MAX_TAGS}, helps students find it)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {(tags ?? []).map((t) => {
          const on = value.includes(t)
          return (
            <button key={t} type="button" onClick={() => toggle(t)} aria-pressed={on}
              className={'rounded-full px-3 py-1 text-sm font-semibold transition-colors ' +
                (on ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')}>
              {t}
            </button>
          )
        })}
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </fieldset>
  )
}

function EventForm({ existing }) {
  const navigate = useNavigate()
  const { saveEvent } = useOrganizerData()
  const [serverError, setServerError] = useState(null)
  // a ref, not state: it must be updated instantly, in the same click that submits the form
  const submitAfterSave = useRef(false)

  const initial = existing
    ? { ...existing, totalSeats: String(existing.totalSeats), price: String(existing.price), description: existing.description ?? '' }
    : empty

  const { field, values, errors, setValue, handleSubmit, submitting } = useForm(initial, rules, async (v) => {
    try {
      const saved = saveEvent(
        { ...v, id: existing?.id, totalSeats: Number(v.totalSeats), price: Number(v.price), title: v.title.trim(), venue: v.venue.trim() },
        { submit: submitAfterSave.current },
      )
      navigate('/organizer', {
        state: { message: submitAfterSave.current ?`"${saved.title}" was saved and sent for approval.` : `"${saved.title}" was saved as a draft.` },
      })
    } catch (e) {
      setServerError(e.message)
    }
  })

  const booked = existing ? existing.totalSeats - existing.availableSeats : 0
  const canSubmit = !existing || existing.status === 'DRAFT'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {existing?.reviewNote && (
        <Notice><strong>Admin note:</strong> {existing.reviewNote}</Notice>
      )}
      {serverError && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">{serverError}</p>}

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">About the event</h2>
        <TextField label="Title" placeholder="e.g. React Workshop" maxLength={150} {...field('title')} />
        <TextAreaField label="Description" rows={5} placeholder="What will students do, learn or win?"
          hint={`${values.description.length}/5000`} {...field('description')} />
        <TagPicker value={values.tags} onChange={(t) => setValue('tags', t)} error={errors.tags} />
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">When and where</h2>
        <TextField label="Venue" placeholder="e.g. Seminar Hall A" {...field('venue')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Starts" type="datetime-local" {...field('startTime')} />
          <TextField label="Ends" type="datetime-local" min={values.startTime || undefined} {...field('endTime')} />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Seats and price</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Total seats" type="number" min={Math.max(1, booked)} max={10000} inputMode="numeric"
            hint={booked ? `${booked} already booked: cannot go below that` : 'Between 1 and 10,000'} {...field('totalSeats')} />
          <TextField label="Price per ticket (₹)" type="number" min={0} step="1" inputMode="decimal"
            hint="0 = free event" {...field('price')} />
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={() => navigate('/organizer')}>Cancel</Button>
        <Button type="submit" variant="secondary" disabled={submitting} onClick={() => { submitAfterSave.current = false }}>
          Save as draft
        </Button>
        {canSubmit && (
          <Button type="submit" disabled={submitting} onClick={() => { submitAfterSave.current = true }}>
            Save and submit for approval
          </Button>
        )}
      </div>
    </form>
  )
}

export default function EventFormPage() {
  const { id } = useParams()
  const { findEvent } = useOrganizerData()
  const existing = id ? findEvent(id) : null

  if (id && !existing) {
    return <EmptyState title="Event not found" message="It may belong to another club."
      action={<Button to="/organizer" variant="secondary">Back to overview</Button>} />
  }
  if (existing?.status === 'PENDING_APPROVAL') {
    return <EmptyState title={`${existing.title} is waiting for approval`}
      message="You can edit it again if the admin sends it back."
      action={<Button to="/organizer" variant="secondary">Back to overview</Button>} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{existing ? 'Edit event' : 'Create event'}</h1>
        {existing && <EventStatusBadge status={existing.status} sentBack={existing.status === 'DRAFT' && Boolean(existing.reviewNote)} />}
      </div>
      {/* key: a fresh form (and fresh values) for every event */}
      <EventForm key={id ?? 'new'} existing={existing} />
    </div>
  )
}
