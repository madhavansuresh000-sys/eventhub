import { useState } from 'react'

import { validate } from '../utils/validation'

/**
 * Form state + validation.
 * - errors appear after you leave a field (blur), or for every field when you press submit
 * - once shown, an error updates live while you type the fix
 */
export default function useForm(initialValues, rules, onValidSubmit) {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const allErrors = validate(values, rules)
  const errors = Object.fromEntries(Object.entries(allErrors).filter(([f]) => touched[f]))

  const field = (name) => ({
    name,
    id: name,
    value: values[name],
    error: errors[name],
    onChange: (e) => {
      const { type, checked, value } = e.target
      setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }))
    },
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(Object.fromEntries(Object.keys(rules).map((f) => [f, true])))
    if (Object.keys(allErrors).length > 0) {
      // move the cursor to the first field that needs fixing
      document.getElementById(Object.keys(allErrors)[0])?.focus()
      return
    }
    setSubmitting(true)
    try {
      await onValidSubmit(values)
    } finally {
      setSubmitting(false)
    }
  }

  return { values, errors, field, handleSubmit, submitting }
}
