// EventHub live demo in a real Microsoft Edge window.
// Opens Edge with a FRESH, SEPARATE profile (no personal logins/history) and drives it through the
// DevTools protocol (the same technique Playwright/Selenium use), with a yellow caption for each step.
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9333
const APP = 'http://localhost:5173'
const PROFILE = join(process.env.TEMP, 'eventhub-demo-edge-profile')
const SHOTS = process.argv[2]
const PAUSE = 2600 // ms between steps, slow enough to follow

const env = readFileSync('D:/Java_FullStack_Journey/02_EventHub_Practice_Project/.env', 'utf8')
const PASSWORD = env.match(/^DEMO_PASSWORD=(.*)$/m)[1].trim() // demo accounts on this laptop only

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(SHOTS, { recursive: true })

// ---- start Edge ----
spawn(EDGE, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  '--window-size=1300,950', '--window-position=40,20', `${APP}/`,
], { detached: true, stdio: 'ignore' }).unref()

let target
for (let i = 0; i < 40 && !target; i++) {
  await sleep(500)
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
    target = list.find((t) => t.type === 'page' && t.url.startsWith(APP))
  } catch { /* Edge still starting */ }
}
if (!target) throw new Error('Edge did not start with the DevTools port')

// ---- tiny DevTools client ----
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let nextId = 1
const waiting = new Map()
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id) }
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++
  waiting.set(id, (msg) => (msg.error ? reject(new Error(method + ': ' + msg.error.message)) : resolve(msg.result)))
  ws.send(JSON.stringify({ id, method, params }))
})
const js = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r.result.value
}
await send('Page.enable')

// ---- helpers that run inside the page ----
const HELPERS = `
window.__demo = {
  caption(text) {
    let el = document.getElementById('demo-caption')
    if (!el) {
      el = document.createElement('div'); el.id = 'demo-caption'
      el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;max-width:900px;' +
        'background:#fde047;color:#111;font:600 20px system-ui;padding:14px 22px;border-radius:14px;' +
        'box-shadow:0 8px 30px rgba(0,0,0,.35);border:3px solid #111;text-align:center'
      document.body.appendChild(el)
    }
    el.textContent = text
  },
  find(text) {
    return [...document.querySelectorAll('button, a')].find((b) => b.offsetParent && b.innerText.trim().startsWith(text))
  },
  async click(text) {
    const el = this.find(text)
    if (!el) throw new Error('No button/link: ' + text)
    el.scrollIntoView({ block: 'center' })
    el.style.outline = '4px solid #ef4444'; el.style.outlineOffset = '3px'
    await new Promise((r) => setTimeout(r, 900))
    el.click()
  },
  type(id, value) {
    const el = document.getElementById(id)
    el.scrollIntoView({ block: 'center' }); el.focus()
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  },
}`
let shot = 0
async function step(caption, action) {
  await js(HELPERS)
  await js(`__demo.caption(${JSON.stringify(caption)})`)
  console.log('STEP:', caption)
  await sleep(PAUSE)
  if (action) await action()
  await sleep(1400)
  await js(HELPERS)
  await js(`__demo.caption(${JSON.stringify(caption)})`)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  shot++
  writeFileSync(join(SHOTS, `step${String(shot).padStart(2, '0')}.png`), Buffer.from(data, 'base64'))
}
const go = async (path) => { await send('Page.navigate', { url: APP + path }); await sleep(1800) }
const url = () => js('location.pathname + location.search')

// ---- the demo ----
await sleep(2500)
await js(`fetch('/api/auth/logout', { method: 'POST', headers: { 'X-XSRF-TOKEN':
  decodeURIComponent((document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN=')) || '=').split('=')[1]) } })`)
await go('/')
await step('1 · A visitor opens EventHub: real events from the MySQL database')
await go('/events/1')
await step('2 · Tech Fest 2026: ₹100 per ticket. Choose 2 tickets and press Book now', async () => {
  await js(`__demo.click('+')`).catch(() => js(`document.querySelector('[aria-label="One ticket more"]').click()`))
  await sleep(700)
  await js(`__demo.click('Book now')`)
})
await step('3 · Not logged in, so EventHub asks to log in first (and remembers the event)')
await step('4 · Log in as Ravi, a student (demo account)', async () => {
  await js(`__demo.type('email', 'ravi@eventhub.test')`)
  await sleep(600)
  await js(`__demo.type('password', ${JSON.stringify(PASSWORD)})`)
  await sleep(800)
  await js(`__demo.click('Log in')`)
})
await step('5 · Back on Tech Fest, logged in. Choose 2 tickets and press Book now', async () => {
  await js(`document.querySelector('[aria-label="One ticket more"]').click()`)
  await sleep(700)
  await js(`__demo.click('Book now')`)
})
await step('6 · The SERVER holds 2 seats for 10 minutes. The timer comes from the server')
const checkout = await url()
await step('7 · Press Pay: the server opens a payment session', async () => { await js(`__demo.click('Pay ')`) })
await step('8 · Test payment page (stands in for Stripe until the Stripe key is added). Press Pay', async () => {
  await js(`__demo.click('Pay ')`)
})
await sleep(2500)
await step('9 · Payment received: the booking is CONFIRMED on the server')
await step('10 · The QR ticket with its unique code, scanned at the gate in Phase 7', async () => {
  await js(`__demo.click('Show my ticket')`)
})
await go('/my-tickets')
await step('11 · My tickets: real bookings from the database')
await go('/events/3')
await step('12 · A FREE event (Intro to Git): Book free seats', async () => { await js(`__demo.click('Book free seats')`) })
await step('13 · Free events are confirmed at once, no payment step')
await go('/my-tickets')
await step('14 · Both bookings in My tickets. Demo finished! (the window stays open for you)')
console.log('CHECKOUT URL WAS:', checkout)
console.log('FINAL URL:', await url())
ws.close()
process.exit(0)
