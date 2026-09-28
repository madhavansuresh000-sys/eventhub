/** "160 booked / 200" progress bar from the Event details sketch. */
export default function SeatsBar({ available, total }) {
  const booked = total - available
  const percent = Math.round((booked / total) * 100)
  const color = available === 0 ? 'bg-red-500' : percent >= 90 ? 'bg-amber-500' : 'bg-brand-600 dark:bg-brand-400'

  return (
    <div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-valuenow={booked}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Seats booked"
      >
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
        {booked} booked / {total} · {percent}% full
      </p>
    </div>
  )
}
