import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'

import AuthCard, { Notice } from '../components/auth/AuthCard'
import Button from '../components/ui/Button'
import { PasswordField, TextField } from '../components/ui/FormField'
import useForm from '../hooks/useForm'
import { loggedIn } from '../store/authSlice'
import { email, required } from '../utils/validation'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const rules = {
  email: [required('Email'), email],
  password: [required('Password')],
}

export default function LoginPage() {
  const [done, setDone] = useState(null)
  const dispatch = useDispatch()

  const { field, handleSubmit, submitting, values } = useForm(
    { email: '', password: '', remember: true },
    rules,
    async (v) => {
      await wait(600) // Phase 5: POST /api/auth/login (the server checks the password and sends a JWT)
      const name = v.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      dispatch(loggedIn({ name, email: v.email.trim(), role: 'STUDENT' }))
      setDone(v.email)
    },
  )

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to book events and see your tickets."
      footer={<>New to EventHub? <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Create an account</Link></>}
    >
      {done ? (
        <Notice tone="success">
          ✅ Logged in as <strong>{done}</strong> (demo: the password is not checked yet). Real login connects to the backend in Phase 5.
        </Notice>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <TextField label="Email" type="email" autoComplete="email" placeholder="you@college.edu" {...field('email')} />
          <PasswordField label="Password" autoComplete="current-password" {...field('password')} />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <input id="remember" type="checkbox" className="h-4 w-4 rounded accent-brand-600"
                checked={values.remember} onChange={field('remember').onChange} />
              Remember me
            </label>
            <Link to="/forgot-password" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Checking…' : 'Log in'}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
