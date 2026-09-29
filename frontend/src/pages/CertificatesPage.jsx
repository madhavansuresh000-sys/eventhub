import { certificatePdfUrl, fetchMyCertificates } from '../api/certificates'
import { Notice } from '../components/auth/AuthCard'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Loader'
import useAsync, { describeError } from '../hooks/useAsync'
import { formatLongDate, gradientFor } from '../utils/format'

/**
 * Certificates exist only for events you ATTENDED (your QR ticket was scanned at the gate) and that are over.
 * The server issues new ones the first time you open this page after the event.
 */
export default function CertificatesPage() {
  const { data: certificates, loading, error } = useAsync(fetchMyCertificates, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My certificates</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          You get a certificate when your QR ticket was scanned at the gate - it appears here after the event ends.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
      ) : error ? (
        <Notice tone="error">{describeError(error).message}</Notice>
      ) : certificates.length === 0 ? (
        <EmptyState title="No certificates yet" message="Book an event, show your QR ticket at the gate, and your certificate appears here after the event."
          action={<Button to="/events" variant="secondary">Browse events</Button>} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {certificates.map((c) => (
            <Card key={c.number} className="overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${gradientFor(c.clubSlug)}`} />
              <div className="p-5">
                <p className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Certificate of participation</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{c.eventTitle}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{c.clubName} · {formatLongDate(c.eventStart)}</p>
                <p className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400">{c.number}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button to={`/certificates/${c.number}`} size="sm">View</Button>
                  <a href={certificatePdfUrl(c.number)} download
                    className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-slate-800">
                    ⬇ Download PDF
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
