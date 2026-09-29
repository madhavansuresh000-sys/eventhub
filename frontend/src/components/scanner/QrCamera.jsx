import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { useEffect, useId, useRef, useState } from 'react'

/**
 * Live camera that reads QR codes (html5-qrcode library: works in every modern browser,
 * and uses the phone's built-in fast BarcodeDetector when there is one).
 * Calls onCode(text) when it sees a code. The same code is ignored for 3 seconds,
 * so one ticket held in front of the camera is not sent ten times.
 */
export default function QrCamera({ onCode }) {
  const boxId = `qr-camera-${useId().replace(/:/g, '')}`
  const onCodeRef = useRef(onCode)
  const [problem, setProblem] = useState(null)

  // always call the newest onCode without restarting the camera
  useEffect(() => {
    onCodeRef.current = onCode
  }, [onCode])

  useEffect(() => {
    const scanner = new Html5Qrcode(boxId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    })
    const last = { code: null, at: 0 }
    const onFound = (text) => {
      const now = Date.now()
      if (text === last.code && now - last.at < 3000) return
      last.code = text
      last.at = now
      onCodeRef.current(text)
    }
    // start() is async: remember it, so stopping waits until the camera has really started
    const started = scanner
      .start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, onFound, () => {})
      .then(() => true)
      .catch((e) => {
        const text = String(e?.name ?? e)
        setProblem(text.includes('NotAllowed')
          ? 'Camera permission was blocked. Allow the camera in the address bar, or type the code below.'
          : 'No camera found (or it is busy). Type the code below instead.')
        return false
      })

    return () => {
      started.then((running) => running && scanner.stop().then(() => scanner.clear()).catch(() => {})) // camera light off
    }
  }, [boxId])

  return (
    <div>
      {problem && <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">{problem}</p>}
      <div id={boxId} className={`overflow-hidden rounded-2xl bg-black ${problem ? 'hidden' : ''}`} />
    </div>
  )
}
