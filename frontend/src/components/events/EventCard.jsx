import { Link } from 'react-router-dom'

import { formatPrice, formatShortDate, seatsInfo } from '../../utils/format'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import { CalendarIcon, MapPinIcon } from '../ui/icons'
import { Skeleton } from '../ui/Loader'
import EventPoster from './EventPoster'

/** One event card, as in the Home page sketch. The whole card is a link to the details page. */
export default function EventCard({ event }) {
  const seats = seatsInfo(event.availableSeats, event.totalSeats)

  return (
    <Card as="article" className="group overflow-hidden transition-shadow hover:shadow-md">
      <Link to={`/events/${event.id}`} className="flex h-full flex-col">
        <EventPoster clubSlug={event.clubSlug} tags={event.tags} />
        <div className="flex flex-1 flex-col p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
            {event.clubName}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
            {event.title}
          </h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <CalendarIcon className="h-4 w-4 shrink-0" /> {formatShortDate(event.startTime)}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <MapPinIcon className="h-4 w-4 shrink-0" /> {event.venue}
          </p>
          <div className="mt-auto flex items-center justify-between pt-4">
            <Badge color={seats.color}>{seats.text}</Badge>
            <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(event.price)}</span>
          </div>
        </div>
      </Link>
    </Card>
  )
}

export function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-40 rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/5" />
      </div>
    </Card>
  )
}
