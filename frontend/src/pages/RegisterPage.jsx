import { useState } from 'react'
import { Link } from 'react-router-dom'

import AuthCard, { Notice } from '../components/auth/AuthCard'
import Button from '../components/ui/Button'
import { PasswordField, SelectField, TextField } from '../components/ui/FormField'
import useForm from '../hooks/useForm'
import {
  email, matches, minLength, mustBeTrue, passwordScore, required, strongPassword,
} from '../utils/validation'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const departments = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'MBA'].map((d) => ({ value: d, label: d }))
const years = [1, 2, 3, 4].map((y) => ({ value: String(y), label: `Year ${y}` }))

const rules = {
  fullName: [required('Full name'), minLength(3, 'Full name')],
  email: [required('Email'), email],
  department: [required('Department')],
  year: [required('Year')],
  password: [required('Password'), strongPassword],
  confirm: [(v) => (v ? '' : 'Please type your password again'), matches('password', 'Passwords do not match')],
  agree: [mustBeTrue('Please accept the rules to continue')],
}

const strength = [
  { label: 'Too weak', color: 'bg-red-500' },
  { label: 'Weak', color: 'bg-red-500' },
  { label: 'Okay', color: 'bg-amber-500' },
  { label: 'Good', color: 'bg-green-500' },
  { label: 'Strong', color: 'bg-green-600' },
]

function StrengthMeter({ password }) {
  if (!password) return null
  const score = passwordScore(password)
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? strength[score].color : 'bg-slate-200 dark:bg-slate-700'}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">Strength: {strength[score].label}</p>
    </div>
  )
}

export default function RegisterPage() {
  const [done, setDone] = useState(null)

  const { field, handleSubmit, submitting, values } = useForm(
    { fullName: '', email: '', department: '', year: '', password: '', confirm: '', agree: false },
    rules,
    async (v) => {
      await wait(700) // Phase 5: POST /api/auth/register
      setDone(v.fullName.trim().split(' ')[0])
    },
  )

  return (
    <AuthCard
      title="Create your account"
      subtitle="Book seats, join waitlists and collect certificates."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Log in</Link></>}
    >
      {done ? (
        <Notice tone="success">
          🎉 Welcome, <strong>{done}</strong>! The form is valid. Accounts are saved to the database in Phase 5.
        </Notice>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <TextField label="Full name" autoComplete="name" placeholder="Madhavan Suresh" {...field('fullName')} />
          <TextField label="College email" type="email" autoComplete="email" placeholder="you@college.edu"
            hint="We send your tickets here." {...field('email')} />

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Department" placeholder="Choose…" options={departments} {...field('department')} />
            <SelectField label="Year" placeholder="Choose…" options={years} {...field('year')} />
          </div>

          <PasswordField label="Password" autoComplete="new-password" hint="At least 8 characters, with letters and numbers."
            {...field('password')}>
            <StrengthMeter password={values.password} />
          </PasswordField>
          <PasswordField label="Confirm password" autoComplete="new-password" {...field('confirm')} />

          <div>
            <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input id="agree" type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-brand-600"
                name="agree" checked={values.agree} onChange={field('agree').onChange} onBlur={field('agree').onBlur}
                aria-invalid={Boolean(field('agree').error)} aria-describedby={field('agree').error ? 'agree-error' : undefined} />
              I agree to follow the event rules and the college code of conduct.
            </label>
            {field('agree').error && <p id="agree-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{field('agree').error}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
