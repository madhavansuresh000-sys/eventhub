import { useCallback, useState } from 'react'

import QrCamera from '../components/scanner/QrCamera'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { currentVolunteer, gateEvents, gateTickets, tryCodes } from '../data/sampleGate'
import { formatTime } from '../utils/format'

/**
 * Decides what the volunteer sees. Green = let in. Red = stop, with the reason.
 * The same checks run on the server in Phase 7.
 */
function checkTicket(code, eventId, tickets, checkIns) {
  const ticket = tickets.find((t) => t.code === code.trim().toUpperCase())
  if (!ticket) {
    return { ok: false, title: 'Not a valid ticket', detail: 'This code is not an EventHub ticket. Ask for the QR in the app.' }
  }
  if (ticket.eventId !== eventId) {
    const other = gateEvents.find((e) => e.id === ticket.eventId)?.title ?? 'another event'
    return { ok: false, title: 'Wrong event', detail: `This ticket is for ${other}.`, ticket }
  }
  if (ticket.status === 'CANCELLED') {
    return { ok: false, title: 'Ticket cancelled', detail: `${ticket.holder} cancelled this booking.`, ticket }
  }
  const usedAt = checkIns[ticket.code] ?? ticket.checkedInAt
  if (usedAt) {
    return { ok: false, title: 'Already checked in', detail: `This ticket was used at ${formatTime(usedAt)}.`, ticket }
  }
  return {
    ok: true,
    title: 'Let in',
    detail: `${ticket.holder} · admits ${ticket.quantity} ${ticket.quantity > 1 ? 'people' : 'person'}`,
    ticket,
  }
}

function ResultPanel({ result }) {
  if (!result) {
    return (
      <div className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700">
        Scan a ticket or type its code.
      </div>
    )
  }
  return (
    <div
      role="alert"
      className={`rounded-2xl p-6 text-center text-white ${result.ok ? 'bg-green-600' : 'bg-red-600'}`}
    >
      <div className="text-6xl font-black leading-none" aria-hidden="true">{result.ok ? '✓' : '✗'}</div>
      <p className="mt-3 text-3xl font-extrabold uppercase tracking-wide">{result.ok ? 'Let in' : 'Stop'}</p>
      <p className="mt-1 text-lg font-semibold">{result.ok ? result.detail : result.title}</p>
      {!result.ok && <p className="mt-1 text-white/90">{result.detail}</p>}
      <p className="mt-3 font-mono text-sm text-white/80">{result.code}</p>
    </div>
  )
}

export default function ScannerPage() {
  const [eventId, setEventId] = useState(gateEvents[0].id)
  const [code, setCode] = useState('')
  const [useCamera, setUseCamera] = useState(false)
  const [result, setResult] = useState(null)
  const [checkIns, setCheckIns] = useState({}) // code -> time it was let in
  const [log, setLog] = useState([])

  // sample gate list until Phase 7 (then the server checks real tickets)
  const tickets = gateTickets

  const event = gateEvents.find((e) => e.id === eventId)
  const admitted = tickets
    .filter((t) => t.eventId === eventId && (checkIns[t.code] || t.checkedInAt))
    .reduce((n, t) => n + t.quantity, 0)

  const scan = useCallback((raw) => {
    const value = raw.trim().toUpperCase()
    if (!value) return
    const r = { ...checkTicket(value, eventId, tickets, checkIns), code: value, at: new Date().toISOString() }
    if (r.ok) setCheckIns((c) => ({ ...c, [value]: r.at }))
    if (!r.ok) navigator.vibrate?.(300) // phones buzz on a red result
    setResult(r)
    setLog((l) => [r, ...l].slice(0, 8))
    setCode('')
  }, [eventId, tickets, checkIns])

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">Gate scanner</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Hi {currentVolunteer.name.split(' ')[0]} 👋</h1>
      </div>

      <Card className="space-y-3 p-4">
        <label htmlFor="gate-event" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gate duty for</label>
        <select id="gate-event" value={eventId}
          onChange={(e) => { setEventId(Number(e.target.value)); setResult(null) }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          {gateEvents.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">{event.venue}</span>
          <span className="font-semibold text-slate-900 dark:text-white">{admitted} checked in</span>
        </div>
      </Card>

      <ResultPanel result={result} />

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
          <input id="ticket-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="or type: EVH-1001-7Q4K"
            autoComplete="off" autoCapitalize="characters"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono uppercase text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          <Button type="submit" disabled={!code.trim()}>Check</Button>
        </form>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Practice (Tech Fest)</p>
          <div className="flex flex-wrap gap-2">
            {tryCodes.map((t) => (
              <button key={t.code} type="button" onClick={() => scan(t.code)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {log.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Recent scans</h2>
          <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {log.map((r) => (
              <li key={r.at} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2">
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-xs font-bold text-white ${r.ok ? 'bg-green-600' : 'bg-red-600'}`}>{r.ok ? '✓' : '✗'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{r.code}</span>
                </span>
                <span className="text-slate-500">{r.ok ? r.ticket.holder : r.title} · {formatTime(r.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
