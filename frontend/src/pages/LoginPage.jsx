import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import AuthCard from '../components/auth/AuthCard'
import Button from '../components/ui/Button'
import { PasswordField, TextField } from '../components/ui/FormField'
import useForm from '../hooks/useForm'
import { homeFor, login, selectUser } from '../store/authSlice'
import { notify } from '../store/notificationsSlice'
import { email, required } from '../utils/validation'

const rules = {
  email: [required('Email'), email],
  password: [required('Password')],
}

/** Only go back to pages of this site (never to a link someone put in ?next=). */
const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null)

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const user = useSelector(selectUser)
  const [serverError, setServerError] = useState(null)
  const next = safeNext(params.get('next'))

  const { field, handleSubmit, submitting } = useForm({ email: '', password: '' }, rules, async (v) => {
    setServerError(null)
    try {
      // POST /api/auth/login: the server checks the BCrypt hash and sets the httpOnly JWT cookie
      const me = await dispatch(login({ email: v.email.trim(), password: v.password })).unwrap()
      dispatch(notify(`Welcome back, ${me.fullName.split(' ')[0]}!`))
      navigate(next ?? homeFor(me), { replace: true })
    } catch (e) {
      setServerError(e.message) // 401 wrong email or password, 429 locked after 5 tries
    }
  })

  // already logged in (e.g. pressed Back after logging in): no need for this page
  if (user && !submitting) return <Navigate to={next ?? homeFor(user)} replace />

  return (
    <AuthCard
      title="Welcome back"
      subtitle={next ? 'Please log in to continue.' : 'Log in to book events and see your tickets.'}
      footer={<>New to EventHub? <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
            {serverError}
          </p>
        )}
        <TextField label="Email" type="email" autoComplete="email" placeholder="you@college.edu" {...field('email')} />
        <PasswordField label="Password" autoComplete="current-password" {...field('password')} />

        <div className="flex justify-end text-sm">
          <Link to="/forgot-password" className="py-1 font-medium text-brand-600 hover:underline dark:text-brand-400">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Checking…' : 'Log in'}
        </Button>
      </form>
    </AuthCard>
  )
}
