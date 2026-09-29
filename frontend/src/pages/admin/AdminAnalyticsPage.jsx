import { useState } from 'react'

import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard'
import { fetchAllAnalytics } from '../../api/analytics'
import { fetchClubs } from '../../api/events'
import useAsync from '../../hooks/useAsync'

/** /admin/analytics - every club together, or one club (Phase 7 step 7). */
export default function AdminAnalyticsPage() {
  const [clubId, setClubId] = useState('')
  const { data: clubs } = useAsync(fetchClubs, [])

  const clubFilter = (
    <label className="ml-auto flex items-center gap-2 text-sm text-slate-500">
      Club
      <select value={clubId} onChange={(e) => setClubId(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
        <option value="">All clubs</option>
        {(clubs ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Sales, gate check-ins and ratings across the college.</p>
      </div>
      <AnalyticsDashboard load={(days) => fetchAllAnalytics(days, clubId)} deps={[clubId]} filters={clubFilter} />
    </div>
  )
}
