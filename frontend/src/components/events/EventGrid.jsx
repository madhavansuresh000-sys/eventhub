import { describeError } from '../../hooks/useAsync'
import EmptyState from '../ui/EmptyState'
import EventCard, { EventCardSkeleton } from './EventCard'

const grid = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'

/** Shows skeletons while loading, a message on error or when empty, otherwise the cards. */
export default function EventGrid({ events, loading, error, skeletons = 6, emptyTitle, emptyMessage, emptyAction }) {
  if (loading) {
    return (
      <div className={grid}>
        {Array.from({ length: skeletons }, (_, i) => <EventCardSkeleton key={i} />)}
      </div>
    )
  }
  if (error) {
    return <EmptyState title="Could not load events" message={describeError(error).message} />
  }
  if (!events?.length) {
    return (
      <EmptyState
        title={emptyTitle ?? 'No events found'}
        message={emptyMessage ?? 'Check back soon for new events.'}
        action={emptyAction}
      />
    )
  }
  return (
    <div className={grid}>
      {events.map((e) => <EventCard key={e.id} event={e} />)}
    </div>
  )
}
