import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { fetchClubs, fetchEvents, fetchTags } from '../api/events'
import EventGrid from '../components/events/EventGrid'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { SearchIcon } from '../components/ui/icons'
import useAsync from '../hooks/useAsync'
import { emojiFor, gradientFor } from '../utils/format'

function SectionHeader({ title, subtitle, to }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-slate-600 dark:text-slate-400">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="shrink-0 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
          See all →
        </Link>
      )}
    </div>
  )
}

/** Events with the highest share of seats booked, that still have seats. */
function fillingFast(events) {
  return events
    .filter((e) => e.availableSeats > 0)
    .map((e) => ({ e, full: (e.totalSeats - e.availableSeats) / e.totalSeats }))
    .sort((a, b) => b.full - a.full)
    .slice(0, 3)
    .map(({ e }) => e)
}

export default function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const upcoming = useAsync(() => fetchEvents({ size: 6 }), [])
  const all = useAsync(() => fetchEvents({ size: 50 }), [])
  const tags = useAsync(fetchTags, [])
  const clubs = useAsync(fetchClubs, [])

  const search = (e) => {
    e.preventDefault()
    navigate(query.trim() ? `/events?q=${encodeURIComponent(query.trim())}` : '/events')
  }

  return (
    <div className="space-y-14">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-14 text-center text-white sm:px-12">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Find and book college events</h1>
        <p className="mx-auto mt-4 max-w-xl text-brand-100">
          Tech fests, hackathons, dance nights and workshops from every club, in one place.
        </p>
        <form onSubmit={search} className="mx-auto mt-8 flex max-w-xl gap-2" role="search">
          <label htmlFor="home-search" className="sr-only">Search events</label>
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="home-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, e.g. hackathon"
              className="w-full rounded-lg border-0 bg-white py-3 pl-10 pr-3 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <Button type="submit" variant="light" size="lg">Search</Button>
        </form>
        {tags.data && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {tags.data.map((t) => (
              <Link
                key={t}
                to={`/events?tag=${t}`}
                className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium hover:bg-white/25"
              >
                {emojiFor([t])} {t}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Upcoming events" subtitle="The next events on campus" to="/events" />
        <EventGrid events={upcoming.data?.content} loading={upcoming.loading} error={upcoming.error} />
      </section>

      <section>
        <SectionHeader title="🔥 Filling fast" subtitle="Book soon, these are almost full" />
        <EventGrid
          events={all.data ? fillingFast(all.data.content) : null}
          loading={all.loading}
          error={all.error}
          skeletons={3}
        />
      </section>

      <section>
        <SectionHeader title="Clubs" subtitle="Who runs the events" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(clubs.data ?? []).map((c) => (
            <Card key={c.id} as={Link} to={`/clubs/${c.slug}`} className="overflow-hidden transition-shadow hover:shadow-md">
              <div className={`h-2 bg-gradient-to-r ${gradientFor(c.slug)}`} />
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">{c.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{c.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
