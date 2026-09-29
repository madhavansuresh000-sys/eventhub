import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { verifyCertificate } from '../api/certificates'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { Skeleton } from '../components/ui/Loader'
import useAsync, { describeError } from '../hooks/useAsync'
import { formatLongDate } from '../utils/format'

function Result({ number }) {
  const { data: c, loading, error } = useAsync(() => verifyCertificate(number), [number])
  if (loading) return <Skeleton className="h-40 w-full" />
  if (error) {
    const notFound = describeError(error).status === 404
    return (
      <div role="alert" className="rounded-2xl bg-red-600 p-6 text-center text-white">
        <p className="text-5xl leading-none font-black" aria-hidden="true">✗</p>
        <p className="mt-2 text-2xl font-extrabold">{notFound ? 'Not a valid certificate' : 'Could not check right now'}</p>
        <p className="mt-1 text-white/90">
          {notFound ? <>No EventHub certificate has the number <span className="font-mono">{number}</span>.</> : describeError(error).message}
        </p>
      </div>
    )
  }
  return (
    <div role="status" className="rounded-2xl bg-green-700 p-6 text-white">
      <p className="text-center text-5xl leading-none font-black" aria-hidden="true">✓</p>
      <p className="mt-2 text-center text-2xl font-extrabold">Genuine EventHub certificate</p>
      <dl className="mx-auto mt-5 grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-white/80">Issued to</dt><dd className="font-semibold">{c.holderName}</dd>
        <dt className="text-white/80">Event</dt><dd className="font-semibold">{c.eventTitle}</dd>
        <dt className="text-white/80">Organised by</dt><dd>{c.clubName}</dd>
        <dt className="text-white/80">Held on</dt><dd>{formatLongDate(c.eventStart)} · {c.venue}</dd>
        <dt className="text-white/80">Number</dt><dd className="font-mono">{c.number}</dd>
      </dl>
    </div>
  )
}

/**
 * PUBLIC page (no login): a company reads the number on a resume, or scans the certificate's QR code,
 * and sees whether EventHub really issued it. /verify/EH-2026-7QK2MP4X
 */
export default function VerifyCertificatePage() {
  const { number } = useParams()
  const navigate = useNavigate()
  const [typed, setTyped] = useState(number ?? '')

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Verify a certificate</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Type the number printed on the certificate, or scan its QR code.</p>
      </div>
      <Card className="p-4">
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault()
          if (typed.trim()) navigate(`/verify/${typed.trim().toUpperCase()}`)
        }}>
          <label htmlFor="cert-number" className="sr-only">Certificate number</label>
          <input id="cert-number" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="EH-2026-7QK2MP4X"
            autoComplete="off" maxLength={30}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-slate-900 uppercase dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          <Button type="submit" disabled={!typed.trim()}>Verify</Button>
        </form>
      </Card>
      {number && <Result number={number} />}
    </div>
  )
}
