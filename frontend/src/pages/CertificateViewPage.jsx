import { QRCodeSVG } from 'qrcode.react'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { sampleAttended } from '../data/sampleStudent'
import { selectStudent } from '../store/studentSlice'
import { formatLongDate } from '../utils/format'

/**
 * A printable certificate. "Save as PDF" uses the browser's print dialog for now;
 * Phase 7 generates real PDF files on the server with a public verify link.
 */
export default function CertificateViewPage() {
  const { id } = useParams()
  const student = useSelector(selectStudent)
  const ticket = sampleAttended.find((t) => t.certificateId === id) // sample until Phase 7

  if (!ticket) {
    return <EmptyState title="Certificate not found" message="Check the certificate ID."
      action={<Button to="/certificates" variant="secondary">My certificates</Button>} />
  }

  const verifyUrl = `https://eventhub.example/verify/${ticket.certificateId}`

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap justify-between gap-3 print:hidden">
        <Button to="/certificates" variant="ghost">← My certificates</Button>
        <Button onClick={() => window.print()}>Download / print PDF</Button>
      </div>

      {/* always light, like paper - also in dark mode */}
      <article className="relative rounded-2xl border-8 border-double border-brand-700 bg-white px-8 py-12 text-center text-slate-800 shadow-sm sm:px-14">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-brand-700">EventHub · {ticket.clubName}</p>
        <h1 className="mt-4 font-serif text-4xl font-bold text-slate-900 sm:text-5xl">Certificate of Participation</h1>
        <p className="mt-8 text-slate-600">This is to certify that</p>
        <p className="mt-2 font-serif text-3xl font-semibold text-brand-800">{student.name}</p>
        {student.course && <p className="mt-1 text-sm text-slate-600">{student.course}</p>}
        <p className="mx-auto mt-6 max-w-lg leading-relaxed text-slate-700">
          participated in <strong>{ticket.title}</strong>, organised by the {ticket.clubName}, held on{' '}
          <strong>{formatLongDate(ticket.startTime)}</strong> at {ticket.venue}.
        </p>

        <div className="mt-12 flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-end">
          <div className="text-left">
            <div className="h-px w-48 bg-slate-400" />
            <p className="mt-2 text-sm font-semibold">Club Coordinator</p>
            <p className="text-xs text-slate-500">{ticket.clubName}</p>
          </div>
          <div className="flex items-center gap-3 text-left">
            <QRCodeSVG value={verifyUrl} size={72} level="M" title="Scan to verify this certificate" />
            <div>
              <p className="text-xs text-slate-500">Certificate ID</p>
              <p className="font-mono text-sm font-semibold">{ticket.certificateId}</p>
              <p className="text-xs text-slate-500">Scan to verify</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
