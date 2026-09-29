import { useSelector } from 'react-redux'

import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard'
import { fetchClubAnalytics } from '../../api/analytics'
import { selectClub, selectOrganizer } from '../../store/organizerSlice'

/** /organizer/analytics - the club's sales, gate check-ins and ratings (Phase 7 step 7). */
export default function OrganizerAnalyticsPage() {
  const { clubId } = useSelector(selectOrganizer)
  const club = useSelector(selectClub)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">How {club?.name ?? 'your club'} is doing: sales, check-ins and ratings.</p>
      </div>
      <AnalyticsDashboard load={(days) => fetchClubAnalytics(clubId, days)} deps={[clubId]} />
    </div>
  )
}
