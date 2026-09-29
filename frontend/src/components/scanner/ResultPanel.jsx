/** Big, clear colours for a busy gate: green = let in, red = stop. */
const look = {
  VALID: { color: 'bg-green-700', mark: '✓', word: 'Let in' },
  ALREADY_USED: { color: 'bg-red-600', mark: '✗', word: 'Already used' },
  INVALID: { color: 'bg-red-600', mark: '✗', word: 'Stop' },
}

/** The answer of one scan: VALID / ALREADY_USED / INVALID (from POST /api/gate/events/{id}/check-in). */
export default function ResultPanel({ result }) {
  if (!result) {
    return (
      <div className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-slate-500 dark:text-slate-400 dark:border-slate-700">
        Scan a ticket or type its code.
      </div>
    )
  }
  const l = look[result.result]
  return (
    <div role="alert" className={`rounded-2xl p-6 text-center text-white ${l.color}`}>
      <div className="text-6xl leading-none font-black" aria-hidden="true">{l.mark}</div>
      <p className="mt-3 text-3xl font-extrabold tracking-wide uppercase">{l.word}</p>
      {result.holder && <p className="mt-1 text-lg font-semibold">{result.holder}</p>}
      <p className="mt-1 text-white/90">{result.message}</p>
      <p className="mt-3 font-mono text-sm text-white/80">{result.code}</p>
    </div>
  )
}
