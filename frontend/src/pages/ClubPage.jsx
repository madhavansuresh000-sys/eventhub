import { useParams } from 'react-router-dom'

import { fetchClub, fetchEvents } from '../api/events'
import EventGrid from '../components/events/EventGrid'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Loader'
import useAsync, { describeError } from '../hooks/useAsync'
import { gradientFor } from '../utils/format'

export default function ClubPage() {
  const { slug } = useParams()
  const club = useAsync(() => fetchClub(slug), [slug])
  const events = useAsync(() => fetchEvents({ club: slug, size: 50 }), [slug])

  if (club.error) {
    const { status, message } = describeError(club.error)
    return (
      <EmptyState
        title={status === 404 ? 'Club not found' : 'Could not load this club'}
        message={status === 404 ? 'The link may be wrong.' : message}
        action={<Button to="/" variant="secondary">Go home</Button>}
      />
    )
  }

  return (
    <div className="space-y-10">
      {club.loading ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : (
        <section className={`rounded-3xl bg-gradient-to-br ${gradientFor(slug)} px-6 py-12 text-white sm:px-10`}>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Club</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight">{club.data.name}</h1>
          <p className="mt-3 max-w-2xl text-white/90">{club.data.description}</p>
          {events.data && (
            <p className="mt-6 inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
              {events.data.totalElements} upcoming event{events.data.totalElements === 1 ? '' : 's'}
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-5 text-2xl font-bold text-slate-900 dark:text-white">Events</h2>
        <EventGrid
          events={events.data?.content}
          loading={events.loading}
          error={events.error}
          skeletons={3}
          emptyTitle="No upcoming events"
          emptyMessage="This club has no published events right now."
        />
      </section>
    </div>
  )
}
