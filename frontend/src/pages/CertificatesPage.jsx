import { Link } from 'react-router-dom'

import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { sampleAttended } from '../data/sampleStudent'
import { formatLongDate, gradientFor } from '../utils/format'

/** Certificates exist only for events you ATTENDED (scanned at the gate) - signature feature 4. */
export default function CertificatesPage() {
  const earned = sampleAttended.filter((t) => t.certificateId) // sample until Phase 7 (gate check-in)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My certificates</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          You get a certificate only when your QR ticket was scanned at the gate.
        </p>
      </div>

      {earned.length === 0 ? (
        <EmptyState title="No certificates yet" message="Attend an event and your certificate appears here the next day." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {earned.map((t) => (
            <Card key={t.certificateId} className="overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${gradientFor(t.clubSlug)}`} />
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Certificate of participation</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{t.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t.clubName} · {formatLongDate(t.startTime)}</p>
                <p className="mt-2 font-mono text-xs text-slate-500">{t.certificateId}</p>
                <div className="mt-4 flex gap-2">
                  <Button to={`/certificates/${t.certificateId}`} size="sm">View and download</Button>
                  <Link to={`/tickets/${t.id}`} className="self-center py-1 text-sm text-brand-600 hover:underline dark:text-brand-400">Ticket</Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
