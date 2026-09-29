import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'

import { checkInTicket, fetchGateEvents, fetchGateStats } from '../api/gate'
import { Notice } from '../components/auth/AuthCard'
import QrCamera from '../components/scanner/QrCamera'
import ResultPanel from '../components/scanner/ResultPanel'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Loader'
import useAsync, { describeError } from '../hooks/useAsync'
import { selectUser } from '../store/authSlice'
import { formatShortDate, formatTime } from '../utils/format'

const STATS_EVERY_MS = 5000 // the live counter: other gates let people in too

function LiveCounter({ stats, totalSeats }) {
  if (!stats) return null
  const percent = stats.bookedPeople ? Math.round((stats.checkedInPeople / stats.bookedPeople) * 100) : 0
  return (
    <div aria-live="polite">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400">Checked in (all gates, live)</span>
        <span className="font-semibold text-slate-900 dark:text-white">
          <span className="text-2xl">{stats.checkedInPeople}</span> / {stats.bookedPeople} booked
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{totalSeats} seats in the hall</p>
    </div>
  )
}

function GateDesk({ events }) {
  const [params, setParams] = useSearchParams()
  const eventId = Number(params.get('event')) || events[0].id
  const event = events.find((e) => e.id === eventId) ?? events[0]
  const [code, setCode] = useState('')
  const [useCamera, setUseCamera] = useState(false)
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(null)
  const [log, setLog] = useState([])
  const [problem, setProblem] = useState(null)
  const busy = useRef(false)

  // live counter: now, and every 5 seconds
  useEffect(() => {
    let current = true
    const load = () => fetchGateStats(event.id).then((s) => current && setStats(s)).catch(() => {})
    load()
    const timer = setInterval(load, STATS_EVERY_MS)
    return () => {
      current = false
      clearInterval(timer)
    }
  }, [event.id])

  const scan = useCallback(async (raw) => {
    const value = raw.trim()
    if (!value || busy.current) return // one scan at a time
    busy.current = true
    setProblem(null)
    try {
      const r = await checkInTicket(event.id, value)
      if (r.result !== 'VALID') navigator.vibrate?.(300) // phones buzz on a red result
      setResult(r)
      setStats(r.stats)
      setLog((l) => [{ ...r, at: new Date().toISOString() }, ...l].slice(0, 8))
      setCode('')
    } catch (e) {
      setProblem(describeError(e).message)
    } finally {
      busy.current = false
    }
  }, [event.id])

  const pickEvent = (id) => {
    setParams({ event: String(id) }, { replace: true })
    setResult(null)
    setLog([])
  }

  return (
    <>
      <Card className="space-y-4 p-4">
        <div>
          <label htmlFor="gate-event" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gate duty for</label>
          <select id="gate-event" value={event.id} onChange={(e) => pickEvent(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            {events.map((e) => <option key={e.id} value={e.id}>{e.title} · {formatShortDate(e.startTime)}</option>)}
          </select>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{event.venue} · {event.clubName}</p>
        </div>
        <LiveCounter stats={stats} totalSeats={event.totalSeats} />
      </Card>

      <ResultPanel result={result} />
      {problem && <Notice tone="error">{problem}</Notice>}

      <Card className="space-y-4 p-4">
        {useCamera ? (
          <>
            <QrCamera onCode={scan} />
            <Button variant="secondary" className="w-full" onClick={() => setUseCamera(false)}>Stop camera</Button>
          </>
        ) : (
          <Button size="lg" className="w-full" onClick={() => setUseCamera(true)}>📷 Scan with camera</Button>
        )}

        <form onSubmit={(e) => { e.preventDefault(); scan(code) }} className="flex gap-2">
          <label htmlFor="ticket-code" className="sr-only">Ticket code</label>
          <input id="ticket-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="or type: EVH-7QK2M-P4XZA"
            autoComplete="off" autoCapitalize="characters" maxLength={60}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-slate-900 uppercase dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          <Button type="submit" disabled={!code.trim()}>Check</Button>
        </form>
      </Card>

      {log.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Recent scans at this gate</h2>
          <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {log.map((r) => (
              <li key={r.at} className="flex items-center justify-between gap-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${look[r.result].color}`}>{look[r.result].mark}</span>
                  <span className="truncate font-mono text-slate-700 dark:text-slate-300">{r.code}</span>
                </span>
                <span className="shrink-0 text-slate-500 dark:text-slate-400">{r.holder ?? look[r.result].word} · {formatTime(r.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

/** Gate duty: volunteers (and organizers) scan QR tickets; the server says VALID / ALREADY USED / INVALID. */
export default function ScannerPage() {
  const user = useSelector(selectUser)
  const { data: events, loading, error } = useAsync(fetchGateEvents, [])

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-400">Gate scanner</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Hi {user.fullName.split(' ')[0]} 👋</h1>
      </div>
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <Notice tone="error">{describeError(error).message}</Notice>
      ) : events.length === 0 ? (
        <EmptyState title="No events to scan" message="You can scan tickets for upcoming published events of the clubs where you volunteer or organize." />
      ) : (
        <GateDesk events={events} />
      )}
    </div>
  )
}
