import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { Notice } from '../../components/auth/AuthCard'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import { SelectField, TextField } from '../../components/ui/FormField'
import Modal from '../../components/ui/Modal'
import useForm from '../../hooks/useForm'
import { notify } from '../../store/notificationsSlice'
import { selectClubEvents, selectVolunteers, volunteerAdded, volunteerRemoved } from '../../store/organizerSlice'
import { email, minLength, required } from '../../utils/validation'

const departments = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'MBA'].map((d) => ({ value: d, label: d }))

const rules = {
  name: [required('Name'), minLength(3, 'Name')],
  email: [required('Email'), email],
  department: [required('Department')],
  eventId: [required('Event')],
}

function AddVolunteerForm({ events, onAdded }) {
  const dispatch = useDispatch()
  const volunteers = useSelector(selectVolunteers)

  const { field, handleSubmit } = useForm({ name: '', email: '', department: '', eventId: '' }, rules, async (v) => {
    const duplicate = volunteers.some((x) => x.email.toLowerCase() === v.email.trim().toLowerCase() && x.eventId === Number(v.eventId))
    if (duplicate) {
      onAdded(null, `${v.email} is already a volunteer for that event.`)
      return
    }
    dispatch(volunteerAdded({ ...v, name: v.name.trim(), email: v.email.trim() }))
    onAdded(v.name.trim()) // the parent changes this form's key, which gives a fresh empty form
  })

  const eventOptions = events.map((e) => ({ value: String(e.id), label: e.title }))

  return (
    <Card as="form" onSubmit={handleSubmit} noValidate className="space-y-4 p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add a volunteer</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" placeholder="Student name" {...field('name')} />
        <TextField label="College email" type="email" placeholder="name@college.edu" {...field('email')} />
        <SelectField label="Department" placeholder="Choose…" options={departments} {...field('department')} />
        <SelectField label="Gate duty for" placeholder="Choose an event…" options={eventOptions} {...field('eventId')} />
      </div>
      <div className="flex justify-end">
        <Button type="submit">Add volunteer</Button>
      </div>
    </Card>
  )
}

/** Volunteers scan QR tickets at the gate (Step 8 builds their scanner screen). */
export default function VolunteersPage() {
  const dispatch = useDispatch()
  const events = useSelector(selectClubEvents)
  const volunteers = useSelector(selectVolunteers)
  const [toRemove, setToRemove] = useState(null)
  const [message, setMessage] = useState(null)
  const [formKey, setFormKey] = useState(0)

  const published = events.filter((e) => e.status === 'PUBLISHED')
  const titleOf = (id) => events.find((e) => e.id === id)?.title ?? 'Unknown event'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Volunteers</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Students who scan QR tickets at the gate of your events.</p>
      </div>

      {message && <Notice tone={message.error ? 'info' : 'success'}>{message.text}</Notice>}

      <AddVolunteerForm
        key={formKey}
        events={published}
        onAdded={(name, error) => {
          if (error) {
            setMessage({ error: true, text: error })
            return
          }
          setMessage({ text: `✅ ${name} was added as a volunteer.` })
          setFormKey((k) => k + 1)
        }}
      />

      {volunteers.length === 0 ? (
        <EmptyState title="No volunteers yet" message="Add students who will help at the gate." />
      ) : (
        <Card className="overflow-hidden">
          {/* relative: keeps the hidden "Actions" label inside this scroll box (it widened the page on phones) */}
          <div className="relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:bg-slate-800/60">
                <tr>
                  <th scope="col" className="px-4 py-3">Name</th>
                  <th scope="col" className="px-4 py-3">Department</th>
                  <th scope="col" className="px-4 py-3">Gate duty</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {volunteers.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{v.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{v.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{v.department}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{titleOf(v.eventId)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setToRemove(v)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(toRemove)}
        onClose={() => setToRemove(null)}
        title="Remove volunteer?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToRemove(null)}>Keep</Button>
            <Button variant="danger" onClick={() => {
              dispatch(volunteerRemoved(toRemove.id))
              dispatch(notify(`${toRemove.name} was removed.`))
              setToRemove(null)
              setMessage(null)
            }}>Remove</Button>
          </>
        }
      >
        {toRemove && <><strong>{toRemove.name}</strong> will no longer be able to scan tickets for {titleOf(toRemove.eventId)}.</>}
      </Modal>
    </div>
  )
}
