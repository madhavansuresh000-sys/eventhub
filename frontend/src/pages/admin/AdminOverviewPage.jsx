import { Link } from 'react-router-dom'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import StatCard from '../../components/ui/StatCard'
import { useAdminData } from '../../state/AdminDataContext'
import { formatMoney, formatShortDate, gradientFor } from '../../utils/format'

const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })

/** One row per club, with a bar showing its share of all tickets sold. */
function ClubTable({ rows }) {
  const maxSold = Math.max(1, ...rows.map((r) => r.sold))
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Club</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Published</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Waiting</th>
            <th scope="col" className="px-4 py-3 font-semibold">Tickets sold</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Money</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map(({ club, published, pending, sold, revenue }) => (
            <tr key={club.id}>
              <th scope="row" className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                <span className="flex items-center gap-2">
                  <span className={`h-3 w-3 shrink-0 rounded-full bg-gradient-to-br ${gradientFor(club.slug)}`} aria-hidden="true" />
                  <Link to={`/clubs/${club.slug}`} className="hover:underline">{club.name}</Link>
                </span>
              </th>
              <td className="px-4 py-3 text-right tabular-nums">{published}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {pending > 0 ? <Badge color="amber">{pending}</Badge> : <span className="text-slate-400">0</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-brand-600 dark:bg-brand-400" style={{ width: `${(sold / maxSold) * 100}%` }} />
                  </div>
                  <span className="tabular-nums">{sold}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatMoney(revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

export default function AdminOverviewPage() {
  const { clubStats, queue, decisions } = useAdminData()

  const total = (key) => clubStats.reduce((n, r) => n + r[key], 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin overview</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">All clubs at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published events" value={total('published')} hint={`Across ${clubStats.length} clubs`} />
        <StatCard label="Tickets sold" value={total('sold')} />
        <StatCard label="Money collected" value={formatMoney(total('revenue'))} hint="Tickets × price" />
        <StatCard label="Waiting for approval" value={queue.length} hint={queue.length ? 'See the queue below' : 'All caught up'} />
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">Clubs</h2>
        <ClubTable rows={clubStats} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Next to review</h2>
            {queue.length > 0 && <Button to="/admin/approvals" size="sm" variant="secondary">Open queue ({queue.length})</Button>}
          </div>
          <Card className="divide-y divide-slate-100 dark:divide-slate-800">
            {queue.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Nothing is waiting. 🎉</p>
            ) : (
              queue.slice(0, 3).map((e) => (
                <div key={e.id} className="p-4">
                  <p className="font-semibold text-slate-900 dark:text-white">{e.title}</p>
                  <p className="text-sm text-slate-500">{e.club.name} · {formatShortDate(e.startTime)}</p>
                </div>
              ))
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">Your recent decisions</h2>
          <Card className="divide-y divide-slate-100 dark:divide-slate-800">
            {decisions.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Approvals and send-backs you make appear here.</p>
            ) : (
              decisions.map((d) => (
                <div key={`${d.eventId}-${d.at}`} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={d.approved ? 'green' : 'red'}>{d.approved ? 'Approved' : 'Sent back'}</Badge>
                    <p className="font-semibold text-slate-900 dark:text-white">{d.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{d.club.name} · {timeFormat.format(new Date(d.at))}</p>
                  {d.reason && <p className="mt-1 text-sm italic text-slate-600 dark:text-slate-400">"{d.reason}"</p>}
                </div>
              ))
            )}
          </Card>
        </section>
      </div>

      <p className="text-xs text-slate-500">
        Sample data for Phase 3 (Coding Club numbers come from the organizer area). A later phase adds a real stats API; Phase 5 shows this page only to admins.
      </p>
    </div>
  )
}
