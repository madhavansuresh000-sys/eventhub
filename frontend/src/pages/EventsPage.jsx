import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { fetchClubs, fetchEvents, fetchTags } from '../api/events'
import EventGrid from '../components/events/EventGrid'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Pagination from '../components/ui/Pagination'
import useAsync from '../hooks/useAsync'

const PAGE_SIZE = 9

const sortOptions = [
  { value: 'date,asc', label: 'Date: soonest first' },
  { value: 'date,desc', label: 'Date: latest first' },
  { value: 'price,asc', label: 'Price: low to high' },
  { value: 'price,desc', label: 'Price: high to low' },
  { value: 'title,asc', label: 'Name: A to Z' },
]

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

/**
 * All events with a filter sidebar. Every filter lives in the URL
 * (/events?tag=tech&page=1), so results can be bookmarked and shared.
 */
export default function EventsPage() {
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const filters = {
    q: params.get('q') ?? '',
    tag: params.get('tag') ?? '',
    club: params.get('club') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    sort: params.get('sort') ?? 'date',
    dir: params.get('dir') ?? 'asc',
    page: Number(params.get('page') ?? 0),
  }
  const [text, setText] = useState(filters.q)

  const events = useAsync(() => fetchEvents({ ...filters, size: PAGE_SIZE }), [params.toString()])
  const tags = useAsync(fetchTags, [])
  const clubs = useAsync(fetchClubs, [])

  /** Changes filters in the URL; any change except the page number goes back to page 1. */
  const update = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v === '' || v === null ? next.delete(k) : next.set(k, v)))
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  const clearAll = () => {
    setText('')
    setParams(new URLSearchParams())
  }

  const hasFilters = ['q', 'tag', 'club', 'from', 'to'].some((k) => params.get(k))
  const data = events.data

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">All events</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {data ? `${data.totalElements} event${data.totalElements === 1 ? '' : 's'} found` : 'Loading events…'}
          </p>
        </div>
        <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setShowFilters((s) => !s)}>
          {showFilters ? 'Hide filters' : 'Show filters'}
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <Card className="space-y-5 p-5 lg:sticky lg:top-24">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                update({ q: text.trim() })
              }}
              role="search"
            >
              <label htmlFor="q" className={labelClass}>Search</label>
              <div className="mt-1 flex gap-2">
                <input id="q" type="search" value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. hackathon" className={`${inputClass} mt-0`} />
                <Button type="submit" size="sm">Go</Button>
              </div>
            </form>

            <div>
              <span className={labelClass}>Tag</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(tags.data ?? []).map((t) => {
                  const active = filters.tag === t
                  return (
                    <button key={t} type="button" onClick={() => update({ tag: active ? '' : t })}
                      aria-pressed={active}
                      className={
                        'rounded-full px-3 py-1 text-xs font-semibold transition-colors ' +
                        (active
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')
                      }>
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label htmlFor="club" className={labelClass}>Club</label>
              <select id="club" value={filters.club} onChange={(e) => update({ club: e.target.value })} className={inputClass}>
                <option value="">All clubs</option>
                {(clubs.data ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="from" className={labelClass}>From</label>
                <input id="from" type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label htmlFor="to" className={labelClass}>To</label>
                <input id="to" type="date" value={filters.to} min={filters.from || undefined}
                  onChange={(e) => update({ to: e.target.value })} className={inputClass} />
              </div>
            </div>

            <div>
              <label htmlFor="sort" className={labelClass}>Sort by</label>
              <select id="sort" value={`${filters.sort},${filters.dir}`}
                onChange={(e) => {
                  const [sort, dir] = e.target.value.split(',')
                  update({ sort, dir })
                }}
                className={inputClass}>
                {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="w-full" onClick={clearAll}>Clear all filters</Button>
            )}
          </Card>
        </aside>

        <section aria-live="polite">
          <EventGrid
            events={data?.content}
            loading={events.loading}
            error={events.error}
            emptyTitle="No events match your filters"
            emptyMessage="Try another tag, a wider date range, or clear the filters."
            emptyAction={hasFilters && <Button variant="secondary" size="sm" onClick={clearAll}>Clear filters</Button>}
          />
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onChange={(p) => {
                update({ page: p === 0 ? '' : p })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          )}
        </section>
      </div>
    </div>
  )
}
