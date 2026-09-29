import { useParams } from 'react-router-dom'

import { fetchEventFeedback } from '../../api/feedback'
import { Notice } from '../../components/auth/AuthCard'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Loader'
import { Stars } from '../../components/ui/StarRating'
import StatCard from '../../components/ui/StatCard'
import useAsync, { describeError } from '../../hooks/useAsync'
import { formatShortDate } from '../../utils/format'

/** What students said about one event: average, how many gave each star, and anonymous comments. */
export default function EventFeedbackPage() {
  const { id } = useParams()
  const { data: f, loading, error } = useAsync(() => fetchEventFeedback(id), [id])

  if (loading) return <Skeleton className="h-96 w-full" />
  if (error) return <Notice tone="error">{describeError(error).message}</Notice>

  const most = Math.max(1, ...f.stars)
  const answered = f.attended ? Math.round((f.count / f.attended) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <Button to="/organizer" variant="ghost" size="sm">← Dashboard</Button>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Feedback: {f.eventTitle}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Comments are anonymous, so students can be honest.</p>
      </div>

      {f.count === 0 ? (
        <EmptyState title="No ratings yet" message="Students who attended can rate the event after it ends." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Average rating" value={<span className="flex items-center gap-2">{f.average.toFixed(1)} <Stars value={f.average} className="text-lg" /></span>} />
            <StatCard label="Ratings" value={f.count} />
            <StatCard label="Attended who rated" value={`${answered}%`} />
          </div>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Stars</h2>
            <ul className="space-y-2">
              {[5, 4, 3, 2, 1].map((n) => (
                <li key={n} className="flex items-center gap-3 text-sm">
                  <span className="w-10 text-slate-600 dark:text-slate-400">{n} ★</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${(f.stars[n - 1] / most) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-medium text-slate-900 dark:text-white">{f.stars[n - 1]}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Comments ({f.comments.length})</h2>
            {f.comments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Students gave stars but no comments.</p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {f.comments.map((c, i) => (
                  <li key={i} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Stars value={c.rating} className="text-sm" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatShortDate(c.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">“{c.comment}”</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
