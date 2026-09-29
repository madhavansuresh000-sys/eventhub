import { QRCodeSVG } from 'qrcode.react'
import { useParams } from 'react-router-dom'

import { certificatePdfUrl, verifyCertificate, verifyPageUrl } from '../api/certificates'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Loader'
import useAsync from '../hooks/useAsync'
import { formatLongDate } from '../utils/format'

/**
 * The certificate on screen (the same text as the PDF the server makes with OpenPDF).
 * Data comes from the verify API: exactly what the paper shows, nothing more.
 */
export default function CertificateViewPage() {
  const { number } = useParams()
  const { data: c, loading, error } = useAsync(() => verifyCertificate(number), [number])

  if (loading) return <Skeleton className="mx-auto h-[28rem] max-w-3xl" />
  if (error) {
    return <EmptyState title="Certificate not found" message="Check the certificate number."
      action={<Button to="/certificates" variant="secondary">My certificates</Button>} />
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap justify-between gap-3 print:hidden">
        <Button to="/certificates" variant="ghost">← My certificates</Button>
        <a href={certificatePdfUrl(c.number)} download
          className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          ⬇ Download PDF
        </a>
      </div>

      {/* always light, like paper - also in dark mode */}
      <article className="relative rounded-2xl border-8 border-double border-brand-700 bg-white px-8 py-12 text-center text-slate-800 shadow-sm sm:px-14">
        <p className="text-sm font-bold tracking-[0.3em] text-brand-700 uppercase">EventHub · {c.clubName}</p>
        <h1 className="mt-4 font-serif text-4xl font-bold text-slate-900 sm:text-5xl">Certificate of Participation</h1>
        <p className="mt-8 text-slate-600">This is to certify that</p>
        <p className="mt-2 font-serif text-3xl font-semibold text-brand-800 italic">{c.holderName}</p>
        <p className="mx-auto mt-6 max-w-lg leading-relaxed text-slate-700">
          participated in <strong>{c.eventTitle}</strong>, organised by the {c.clubName}, held on{' '}
          <strong>{formatLongDate(c.eventStart)}</strong> at {c.venue}.
        </p>

        <div className="mt-12 flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-end">
          <div className="text-left">
            <div className="h-px w-48 bg-slate-400" />
            <p className="mt-2 text-sm font-semibold">Club Coordinator</p>
            <p className="text-xs text-slate-500">{c.clubName}</p>
          </div>
          <div className="flex items-center gap-3 text-left">
            <QRCodeSVG value={verifyPageUrl(c.number)} size={72} level="M" title="Scan to verify this certificate" />
            <div>
              <p className="text-xs text-slate-500">Certificate number</p>
              <p className="font-mono text-sm font-semibold">{c.number}</p>
              <p className="text-xs text-slate-500">Scan to verify</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
