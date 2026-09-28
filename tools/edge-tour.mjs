// EventHub GUIDED TOUR in a real Microsoft Edge window, with an explanation on screen for every step.
// Student books and pays -> organizer creates an event -> admin approves it -> security blocks a wrong user.
// Uses a FRESH, SEPARATE Edge profile (none of your logins/history), driven by the DevTools protocol.
//   node tools/edge-tour.mjs tour-shots
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9334
const APP = 'http://localhost:5173'
const PROFILE = join(process.env.TEMP, 'eventhub-demo-edge-profile')
const SHOTS = process.argv[2] ?? 'tour-shots'
const READ_TIME = 4200 // ms to read each explanation

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const PASSWORD = env.match(/^DEMO_PASSWORD=(.*)$/m)[1].trim() // demo accounts, this laptop only

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(SHOTS, { recursive: true })

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

const HELPERS = `
window.__tour = {
  caption(title, text) {
    let el = document.getElementById('tour-caption')
    if (!el) {
      el = document.createElement('div'); el.id = 'tour-caption'
      el.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;width:min(980px,92vw);' +
        'background:#fde047;color:#111;padding:14px 22px;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.35);' +
        'border:3px solid #111;font-family:system-ui'
      document.body.appendChild(el)
    }
    el.innerHTML = '<div style="font:800 21px system-ui"></div><div style="font:500 16px system-ui;margin-top:5px;line-height:1.35"></div>'
    el.children[0].textContent = title
    el.children[1].textContent = text
  },
  visible(root, text) {
    return [...root.querySelectorAll('button, a')].find((b) => b.offsetParent && b.innerText.trim().startsWith(text))
  },
  async press(el) {
    el.scrollIntoView({ block: 'center' })
    el.style.outline = '4px solid #ef4444'; el.style.outlineOffset = '3px'
    await new Promise((r) => setTimeout(r, 1000))
    el.click()
  },
  async click(text) {
    const el = this.visible(document, text)
    if (!el) throw new Error('No button/link: ' + text)
    await this.press(el)
  },
  async clickIn(cardTitle, text) {
    const heading = [...document.querySelectorAll('main h2, main h3')].find((h) => h.innerText.trim() === cardTitle)
    if (!heading) throw new Error('No card: ' + cardTitle)
    let card = heading
    while (card && !this.visible(card, text)) card = card.parentElement
    await this.press(this.visible(card, text))
  },
  async inDialog(text) {
    await this.press(this.visible(document.querySelector('[role=dialog]'), text))
  },
  type(id, value) {
    const el = document.getElementById(id)
    el.scrollIntoView({ block: 'center' }); el.focus()
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('blur', { bubbles: true }))
  },
}`
let shot = 0
async function step(title, text, action) {
  await js(HELPERS)
  await js(`__tour.caption(${JSON.stringify(title)}, ${JSON.stringify(text)})`)
  console.log('STEP', shot + 1, '-', title)
  await sleep(READ_TIME)
  if (action) await action()
  await sleep(1600)
  await js(HELPERS)
  await js(`__tour.caption(${JSON.stringify(title)}, ${JSON.stringify(text)})`)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(SHOTS, `tour${String(++shot).padStart(2, '0')}.png`), Buffer.from(data, 'base64'))
}
const go = async (path) => { await send('Page.navigate', { url: APP + path }); await sleep(2000) }
const logout = () => js(`fetch('/api/auth/logout', { method: 'POST', headers: { 'X-XSRF-TOKEN':
  decodeURIComponent((document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN=')) || '=').split('=')[1]) } })`)
async function login(email) {
  await go('/login')
  await js(HELPERS)
  await js(`__tour.type('email', ${JSON.stringify(email)})`)
  await sleep(500)
  await js(`__tour.type('password', ${JSON.stringify(PASSWORD)})`)
  await sleep(500)
  await js(`__tour.click('Log in')`)
  await sleep(2200)
}
const daysAhead = (d, h) => {
  const t = new Date(Date.now() + d * 86400000); t.setHours(h, 0, 0, 0)
  const p = (n) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:00`
}
const newEvent = `Kotlin for Beginners ${new Date().toTimeString().slice(0, 5)}`

// ================= the tour =================
await sleep(2500)
await logout()

// ---- Part 1: visitor ----
await go('/')
await step('1 · Welcome to EventHub',
  'A React app (port 5173) talking to a Spring Boot API (port 8080) with a MySQL database in Docker. Every event here comes from MySQL.')
await go('/events?tag=robotics')
await step('2 · Search and filters run on the SERVER',
  'Chip "robotics" → React calls GET /api/events?tag=robotics → Spring Data JPA builds the SQL WHERE clause → only matching, PUBLISHED events come back.')
await go('/events/15')
await step('3 · Event details: Robo Race, ₹100, live seat count',
  'The seat bar shows booked vs total seats straight from the events table. A visitor can look, but must log in to book.',
  () => js(`__tour.click('Book now')`))
await step('4 · Not logged in → sent to Login, and EventHub remembers the event',
  'RequireAuth + ?next=/events/15: after login we come straight back here.')

// ---- Part 2: student Ravi books and pays ----
await step('5 · Log in as Ravi (student)',
  'The server checks the BCrypt password hash and sends a JWT inside an httpOnly cookie: JavaScript cannot read it, so it cannot be stolen by a script.',
  async () => {
    await js(`__tour.type('email', 'ravi@eventhub.test')`)
    await sleep(500)
    await js(`__tour.type('password', ${JSON.stringify(PASSWORD)})`)
    await sleep(500)
    await js(`__tour.click('Log in')`)
  })
await step('6 · Back on Robo Race, logged in. Press Book now',
  'POST /api/bookings: the server takes 1 seat using optimistic locking (@Version), so two students can NEVER get the same last seat.',
  () => js(`__tour.click('Book now')`))
await step('7 · Checkout: the seat is HELD for 10 minutes',
  'The timer comes from the SERVER (secondsLeft), not the phone clock. If Ravi does not pay, a job running every minute gives the seat back.')
await step('8 · Press Pay',
  'The server opens a payment session: Stripe Checkout when a Stripe key is in .env, otherwise this built-in TEST page (development only).',
  () => js(`__tour.click('Pay ')`))
await step('9 · Test payment page · no real money. Press Pay',
  'Pay runs EXACTLY the same confirm code as a real Stripe webhook, and it is idempotent: the same message twice never confirms twice.',
  () => js(`__tour.click('Pay ')`))
await sleep(2500)
await step('10 · Payment received → booking CONFIRMED on the server',
  'The success page asks the server until it says CONFIRMED: the server decides, never the browser.',
  () => js(`__tour.click('Show my ticket')`))
await step('11 · The QR ticket',
  'Each booking gets a unique ticket code (EVH-…). In Phase 7 volunteers scan it at the gate: green LET IN, red STOP.')
await go('/my-tickets')
await step('12 · My tickets: all of Ravi\'s bookings from the database',
  'Upcoming / Past / Cancelled tabs. A booking waiting for payment shows "Pay now"; a paid one can be cancelled (seats back + refund).')

// ---- Part 3: organizer Madhavan creates an event ----
await logout()
await login('madhavan@eventhub.test')
await go('/organizer')
await step('13 · Madhavan = ORGANIZER of the Coding Club',
  'Club roles live in the club_members table and are checked on EVERY request, so the menu now shows "Organizer" and "Scanner".')
await go('/organizer/events/new')
await step('14 · Create a new event',
  'Every field is checked twice: in the browser (quick help while typing) and again on the server (@Valid + business rules).',
  async () => {
    await js(`__tour.type('title', ${JSON.stringify(newEvent)})`)
    await js(`__tour.type('description', 'Hands-on intro to Kotlin: variables, functions and a small Android-style app.')`)
    await js(`__tour.type('venue', 'CSE Block Lab 2')`)
    await js(`__tour.type('startTime', ${JSON.stringify(daysAhead(20, 14))})`)
    await js(`__tour.type('endTime', ${JSON.stringify(daysAhead(20, 17))})`)
    await js(`__tour.type('totalSeats', '60')`)
    await js(`__tour.type('price', '49')`)
    await sleep(600)
    await js(`__tour.click('coding')`)
  })
await step('15 · Save and submit for approval',
  'The event is saved as DRAFT, then moves to PENDING_APPROVAL. Students cannot see it yet. The audit log records who did it.',
  () => js(`__tour.click('Save and submit')`))

// ---- Part 4: admin approves ----
await logout()
await login('admin@eventhub.test')
await go('/admin/approvals')
await step('16 · Admin: the approval queue',
  'Only accounts with the ADMIN role may open this page, and the server checks the same rule on every call (/api/admin/**).',
  () => js(`__tour.clickIn(${JSON.stringify(newEvent)}, 'Approve')`))
await step('17 · Confirm the approval',
  'PENDING_APPROVAL → PUBLISHED. From this moment students can find and book it.',
  () => js(`__tour.inDialog('Approve')`))
await go('/admin')
await step('18 · Admin overview + Activity log',
  'Totals per club come from one GROUP BY query. The Activity log (audit_log table) shows WHO created, submitted and approved each event.')

// ---- Part 5: security ----
await logout()
await login('kavya@eventhub.test')
await go('/admin')
await step('19 · Security: Kavya (Cultural Club organizer) tries the admin area',
  'Blocked. Even if she called the API directly, the server answers 403 Forbidden. The page only hides things; the SERVER protects them.')
await go('/events')
await step('20 · End of the tour',
  'Visitor → student booking with payment → organizer → admin approval → security. Phases 0–6 of EventHub, working together. 🎉')

console.log('NEW EVENT:', newEvent)
ws.close()
process.exit(0)
