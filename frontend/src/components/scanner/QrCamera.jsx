import { useEffect, useRef, useState } from 'react'

/**
 * Live camera that reads QR codes with the browser's built-in BarcodeDetector.
 * Calls onCode(text) when it sees a code (the same code is ignored for 3 seconds,
 * so one ticket held in front of the camera is not scanned ten times).
 */
export default function QrCamera({ onCode }) {
  const videoRef = useRef(null)
  const onCodeRef = useRef(onCode)
  const [problem, setProblem] = useState(() =>
    'BarcodeDetector' in window ? null : 'This browser cannot read QR codes with the camera. Type the code below instead.',
  )

  // always call the newest onCode without restarting the camera
  useEffect(() => {
    onCodeRef.current = onCode
  }, [onCode])

  useEffect(() => {
    if (!('BarcodeDetector' in window)) return undefined

    let stream
    let timer
    let stopped = false
    const last = { code: null, at: 0 }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (stopped) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        timer = setInterval(async () => {
          try {
            const [found] = await detector.detect(videoRef.current)
            if (!found) return
            const now = Date.now()
            if (found.rawValue === last.code && now - last.at < 3000) return
            last.code = found.rawValue
            last.at = now
            onCodeRef.current(found.rawValue)
          } catch {
            /* a frame could not be read: try the next one */
          }
        }, 300)
      } catch (e) {
        setProblem(e.name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow the camera in the address bar, or type the code below.'
          : 'No camera found. Type the code below instead.')
      }
    }
    start()

    return () => {
      stopped = true
      clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop()) // turns the camera light off
    }
  }, [])

  if (problem) {
    return <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">{problem}</p>
  }
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} className="aspect-square w-full object-cover sm:aspect-video" muted playsInline />
      {/* aiming square */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="h-48 w-48 rounded-2xl border-4 border-white/80" />
      </div>
    </div>
  )
}
