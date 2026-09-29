import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import useAsync, { describeError } from '../../hooks/useAsync'
import { formatMoney, formatShortDate } from '../../utils/format'
import Button from '../ui/Button'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import { Skeleton } from '../ui/Loader'
import StatCard from '../ui/StatCard'

const RANGES = [7, 30, 90]

const dayFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const longDayFormat = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const clockFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })

// "2026-09-29" is read as local midnight (new Date("2026-09-29") would be UTC midnight)
const toDay = (isoDate) => new Date(`${isoDate}T00:00:00`)
const percent = (rate) => `${Math.round(rate * 100)}%`

/** The hover box of a chart: the day and its value, in text colours (the bar next to it carries the colour). */
function DayTooltip({ active, payload, format }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-slate-500">{longDayFormat.format(toDay(point.date))}</p>
      <p className="font-bold text-slate-900 dark:text-white">{format(payload[0].value)}</p>
    </div>
  )
}

/** One measure per chart - tickets and money have different scales, so they never share an axis. */
function DayChart({ title, data, dataKey, format, axisFormat = format }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="date" tickFormatter={(d) => dayFormat.format(toDay(d))} minTickGap={24}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
            <YAxis allowDecimals={false} tickFormatter={axisFormat} width={56}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip content={<DayTooltip format={format} />} cursor={{ fill: 'var(--chart-grid)', opacity: 0.6 }} />
            <Bar dataKey={dataKey} fill="var(--chart-mark)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

/** The same per-day numbers as a table (screen readers, and anyone who wants exact values). */
function DayTable({ perDay }) {
  const withSales = perDay.filter((d) => d.tickets > 0)
  return (
    <details className="text-sm">
      <summary className="cursor-pointer py-1 text-slate-600 hover:underline dark:text-slate-400">Show the numbers as a table</summary>
      <Card className="mt-2 overflow-x-auto">
        {withSales.length === 0 ? (
          <p className="p-4 text-slate-500">No tickets sold in this period.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Day</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Tickets</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Money</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {withSales.map((d) => (
                <tr key={d.date}>
                  <th scope="row" className="px-4 py-2 font-normal">{longDayFormat.format(toDay(d.date))}</th>
                  <td className="px-4 py-2 text-right tabular-nums">{d.tickets}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </details>
  )
}

/** Per event: seats sold, how many came through the gate, money, stars. */
function EventTable({ events }) {
  if (events.length === 0) {
    return <EmptyState title="No events in this period" message="Published events starting in this period (or later) appear here." />
  }
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Event</th>
            <th scope="col" className="px-4 py-3 font-semibold">Sold</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Came</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Money</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {events.map((e) => (
            <tr key={e.eventId}>
              <th scope="row" className="px-4 py-3 font-normal">
                <span className="block font-medium text-slate-900 dark:text-white">{e.title}</span>
                <span className="text-xs text-slate-500">{formatShortDate(e.startTime)}</span>
              </th>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-brand-600 dark:bg-brand-500"
                      style={{ width: `${Math.min(100, (e.ticketsSold / Math.max(1, e.totalSeats)) * 100)}%` }} />
                  </div>
                  <span className="whitespace-nowrap tabular-nums">{e.ticketsSold} / {e.totalSeats}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {!e.started ? <span className="text-slate-400" title="The gate is not open yet">not started</span>
                  : e.ticketsSold === 0 ? <span className="text-slate-400">—</span>
                    : <>{e.checkedIn} <span className="text-slate-500">({percent(e.checkedIn / e.ticketsSold)})</span></>}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatMoney(e.revenue)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {e.ratings === 0 ? <span className="text-slate-400">—</span>
                  : <>⭐ {e.averageRating.toFixed(1)} <span className="text-slate-500">({e.ratings})</span></>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

/**
 * Charts and numbers for one club (organizer) or all clubs (admin).
 *   <AnalyticsDashboard load={(days) => fetchClubAnalytics(clubId, days)} deps={[clubId]} />
 * `deps`: when these change (e.g. another club picked), the numbers are loaded again.
 */
export default function AnalyticsDashboard({ load, deps = [], filters = null }) {
  const [days, setDays] = useState(30)
  const [attempt, setAttempt] = useState(0)
  const { data, loading, error } = useAsync(() => load(days), [days, attempt, ...deps])

  const t = data?.totals

  return (
    <div className="space-y-6">
      {/* all filters in one row above the charts */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Last</span>
        {RANGES.map((n) => (
          <button key={n} type="button" onClick={() => setDays(n)} aria-pressed={days === n}
            className={'rounded-full px-3 py-1.5 text-sm font-medium transition-colors ' + (days === n
              ? 'bg-brand-600 text-white'
              : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800')}>
            {n} days
          </button>
        ))}
        {filters}
      </div>

      {error ? (
        <EmptyState title="Could not load the numbers" message={describeError(error).message}
          action={<Button onClick={() => setAttempt((a) => a + 1)}>Try again</Button>} />
      ) : loading && !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className={'space-y-6 transition-opacity ' + (loading ? 'opacity-60' : '')}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tickets sold" value={t.ticketsSold} hint={`Paid in the last ${data.days} days`} />
            <StatCard label="Money collected" value={formatMoney(t.revenue)} hint="Cancelled tickets not counted" />
            <StatCard label="Check-in rate" value={t.checkInRate == null ? '—' : percent(t.checkInRate)}
              hint={t.expectedAtGate === 0 ? 'No started event with tickets yet' : `${t.checkedIn} of ${t.expectedAtGate} came through the gate`} />
            <StatCard label="Average rating" value={t.averageRating == null ? '—' : `⭐ ${t.averageRating.toFixed(1)}`}
              hint={t.ratings === 0 ? 'No ratings yet' : `From ${t.ratings} rating${t.ratings === 1 ? '' : 's'}`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DayChart title="Tickets per day" data={data.perDay} dataKey="tickets" format={(v) => `${v} ticket${v === 1 ? '' : 's'}`} axisFormat={(v) => v} />
            <DayChart title="Money per day" data={data.perDay} dataKey="revenue" format={formatMoney} />
          </div>
          <DayTable perDay={data.perDay} />

          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">Events</h2>
            <EventTable events={data.events} />
          </section>

          <p className="text-xs text-slate-500">
            Counted at {clockFormat.format(new Date(data.generatedAt))}. The server keeps these numbers for 1 minute
            (cache), so a new booking can take up to a minute to show here.
          </p>
        </div>
      )}
    </div>
  )
}
