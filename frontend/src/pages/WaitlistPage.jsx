import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'

import { fetchEvent } from '../api/events'
import { Notice } from '../components/auth/AuthCard'
import EventPoster from '../components/events/EventPoster'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import useAsync from '../hooks/useAsync'
import { notify } from '../store/notificationsSlice'
import { selectWaitlist, waitlistJoined, waitlistLeft } from '../store/studentSlice'
import { formatShortDate } from '../utils/format'

/** Shown when you arrive from "Join waitlist" on a sold-out event (/waitlist?event=6). */
function JoinCard({ eventId }) {
  const waitlist = useSelector(selectWaitlist)
  const dispatch = useDispatch()
  const { data: event, loading, error } = useAsync(() => fetchEvent(eventId), [eventId])
  const [joined, setJoined] = useState(false)

  if (loading) return <Skeleton className="h-40 w-full" />
  if (error) return null
  if (waitlist.some((w) => w.eventId === event.id)) {
    return <Notice tone="success">{joined ? '✅ You joined the waitlist for' : 'You are already on the waitlist for'} <strong>{event.title}</strong>.</Notice>
  }
  if (!event.soldOut) {
    return <Notice><strong>{event.title}</strong> still has seats. <Link to={`/events/${event.id}`} className="font-semibold underline">Book directly</Link>.</Notice>
  }

  const join = () => {
    dispatch(waitlistJoined({
      eventId: event.id, title: event.title, clubName: event.club.name, clubSlug: event.club.slug, venue: event.venue,
      startTime: event.startTime, tags: event.tags, position: 4, joinedAt: new Date().toISOString(),
    }))
    setJoined(true)
  }

  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className="flex-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Join the waitlist for {event.title}?</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          It is sold out. When someone cancels, the seat goes to the first person in the queue, and we email you.
        </p>
      </div>
      <Button onClick={join}>Join waitlist</Button>
    </Card>
  )
}

export default function WaitlistPage() {
  const [params] = useSearchParams()
  const waitlist = useSelector(selectWaitlist)
  const dispatch = useDispatch()
  const [toLeave, setToLeave] = useState(null)
  const eventId = params.get('event')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My waitlist</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">First in, first out: the student at number 1 gets the next free seat.</p>
      </div>

      {eventId && <JoinCard eventId={eventId} />}

      {waitlist.length === 0 ? (
        <EmptyState title="You are not on any waitlist" message="When an event is full, you can join its waitlist from the event page."
          action={<Button to="/events" variant="secondary">Browse events</Button>} />
      ) : (
        <div className="space-y-4">
          {waitlist.map((w) => (
            <Card key={w.eventId} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <EventPoster clubSlug={w.clubSlug} tags={w.tags} className="h-24 w-full shrink-0 rounded-xl sm:w-32" emojiSize="text-3xl" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{w.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{formatShortDate(w.startTime)} · {w.venue}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge color="amber">WAITLIST #{w.position}</Badge>
                  <span className="text-xs text-slate-500">
                    {w.position === 1 ? 'You are next in line!' : `${w.position - 1} student${w.position > 2 ? 's' : ''} ahead of you`}
                  </span>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setToLeave(w)}>Leave waitlist</Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(toLeave)}
        onClose={() => setToLeave(null)}
        title="Leave the waitlist?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToLeave(null)}>Stay in line</Button>
            <Button variant="danger" onClick={() => {
              dispatch(waitlistLeft(toLeave.eventId))
              dispatch(notify(`You left the waitlist for ${toLeave.title}.`))
              setToLeave(null)
            }}>Leave</Button>
          </>
        }
      >
        {toLeave && <>You will lose your place (#{toLeave.position}) for <strong>{toLeave.title}</strong>.</>}
      </Modal>
    </div>
  )
}
