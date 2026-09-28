import { useEffect, useState } from 'react'

/**
 * Loads data when the page opens (and again when `deps` change).
 *   const { data, loading, error } = useAsync(() => fetchEvent(id), [id])
 * Answers that arrive after the page has moved on are ignored.
 */
export default function useAsync(load, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  // the caller passes `deps` (like useEffect itself), so the linter cannot check them here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let current = true
    setState((s) => ({ ...s, loading: true, error: null }))
    load()
      .then((data) => current && setState({ data, loading: false, error: null }))
      .catch((error) => current && setState({ data: null, loading: false, error }))
    return () => {
      current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}

/** Turns an Axios error into { status, message } using the backend's problem-details JSON. */
export function describeError(error) {
  const status = error?.response?.status
  const detail = error?.response?.data?.detail
  if (!status) return { status: 0, message: 'Cannot reach the server. Is the backend running?' }
  return { status, message: detail || 'Something went wrong.' }
}
