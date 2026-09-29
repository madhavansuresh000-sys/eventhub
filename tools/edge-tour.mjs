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
// TOUR_CLEAN=1: no yellow explanation boxes and short pauses - clean screenshots for slides and documents
const CLEAN = process.env.TOUR_CLEAN === '1'
const READ_TIME = CLEAN ? 600 : 4200 // ms to read each explanation

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const PASSWORD = env.match(/^DEMO_PASSWORD=(.*)$/m)[1].trim() // demo accounts, this laptop only

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(SHOTS, { recursive: true })

// ask the API first, before Edge opens (keeps the DevTools connection free of long pauses)
const tourEvent = await pickEventForRavi()

spawn(EDGE, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  '--hide-crash-restore-bubble', '--disable-session-crashed-bubble', // no "restore pages?" after a forced close
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
// Edge may replace its first tab while starting (e.g. after a forced close): wait, then take the tab again
await sleep(3000)
target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page' && t.url.startsWith(APP)) ?? target

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
ws.addEventListener('close', () => { console.error('Edge closed the DevTools connection (tab closed?)'); process.exit(1) })
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
  title = `${shot + 1} · ${title}` // steps are numbered automatically
  if (!CLEAN) await js(`__tour.caption(${JSON.stringify(title)}, ${JSON.stringify(text)})`)
  console.log('STEP', shot + 1, '-', title)
  await sleep(READ_TIME)
  if (action) await action()
  await sleep(1200)
  await settle('/')
  await js(HELPERS)
  if (!CLEAN) await js(`__tour.caption(${JSON.stringify(title)}, ${JSON.stringify(text)})`)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(SHOTS, `tour${String(++shot).padStart(2, '0')}.png`), Buffer.from(data, 'base64'))
}
/** Waits until the page is really ready: loaded, on the expected address, and no loading spinner or skeleton left. */
async function settle(pathStart) {
  for (let i = 0; i < 60; i++) {
    await sleep(250)
    const ready = await js(`document.readyState === 'complete' && location.pathname.startsWith(${JSON.stringify(pathStart)})
      && !document.querySelector('.animate-spin, .animate-pulse') && document.querySelector('main')?.innerText.trim().length > 0`)
      .catch(() => false) // the page may be changing right now
    if (ready) break
  }
  await sleep(700) // let pictures and charts draw
}
const go = async (path) => { await send('Page.navigate', { url: APP + path }); await settle(path.split('?')[0]) }
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
  await sleep(1500)
  await settle('/')
}
const daysAhead = (d, h) => {
  const t = new Date(Date.now() + d * 86400000); t.setHours(h, 0, 0, 0)
  const p = (n) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:00`
}
const newEvent = `Kotlin for Beginners ${new Date().toTimeString().slice(0, 5)}`

/**
 * Ravi may book each event only once, so every run picks a paid event he has NOT booked yet
 * (robotics first, then any tag). Asked from Node straight to the API: login, my bookings, event list.
 */
async function pickEventForRavi() {
  const jar = {}
  const call = async (path, init = {}) => {
    const res = await fetch(`http://localhost:8080${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': jar['XSRF-TOKEN'] ?? '',
        Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') },
    })
    for (const c of res.headers.getSetCookie()) {
      const kv = c.split(';')[0]
      jar[kv.slice(0, kv.indexOf('='))] = kv.slice(kv.indexOf('=') + 1)
    }
    return res
  }
  await call('/api/auth/me') // gives the XSRF cookie
  const login = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'ravi@eventhub.test', password: PASSWORD }) })
  if (!login.ok) throw new Error(`Ravi cannot log in (HTTP ${login.status})`)
  const booked = new Set((await (await call('/api/bookings/mine')).json())
    .filter((b) => b.status === 'HELD' || b.status === 'CONFIRMED').map((b) => b.event.id))
  const soon = Date.now() + 86400000
  const free = (await (await call('/api/events?size=50&sort=date')).json()).content
    .filter((e) => Number(e.price) > 0 && e.availableSeats > 0 && !booked.has(e.id) && new Date(e.startTime) > soon)
  await call('/api/auth/logout', { method: 'POST' })
  // Coding Club first: Priya is its volunteer, so later in the tour she can scan this ticket at the gate
  const pick = free.find((e) => e.clubSlug === 'coding-club') ?? free[0]
  if (!pick) throw new Error('No paid event with free seats that Ravi has not booked yet')
  return pick
}
const price = `₹${Number(tourEvent.price)}`
console.log("Tour event:", tourEvent.id, tourEvent.title)

// ================= the tour =================
await sleep(2500)
await logout()

// ---- Part 1: visitor ----
await go('/')
await step('Welcome to EventHub',
  'A React app (port 5173) talking to a Spring Boot API (port 8080) with a MySQL database in Docker. Every event here comes from MySQL.')
await go('/events?tag=robotics')
await step('Search and filters run on the SERVER',
  'Chip "robotics" → React calls GET /api/events?tag=robotics → Spring Data JPA builds the SQL WHERE clause → only matching, PUBLISHED events come back.')
await go(`/events/${tourEvent.id}`)
await step(`Event details: ${tourEvent.title}, ${price}, live seat count`,
  'The seat bar shows booked vs total seats straight from the events table. A visitor can look, but must log in to book.',
  () => js(`__tour.click('Book now')`))
await step('Not logged in → sent to Login, and EventHub remembers the event',
  `RequireAuth + ?next=/events/${tourEvent.id}: after login we come straight back here.`)

// ---- Part 2: student Ravi books and pays ----
await step('Log in as Ravi (student)',
  'The server checks the BCrypt password hash and sends a JWT inside an httpOnly cookie: JavaScript cannot read it, so it cannot be stolen by a script.',
  async () => {
    await js(`__tour.type('email', 'ravi@eventhub.test')`)
    await sleep(500)
    await js(`__tour.type('password', ${JSON.stringify(PASSWORD)})`)
    await sleep(500)
    await js(`__tour.click('Log in')`)
  })
await step(`Back on ${tourEvent.title}, logged in. Press Book now`,
  'POST /api/bookings: the server takes 1 seat using optimistic locking (@Version), so two students can NEVER get the same last seat.',
  () => js(`__tour.click('Book now')`))
await step('Checkout: the seat is HELD for 10 minutes',
  'The timer comes from the SERVER (secondsLeft), not the phone clock. If Ravi does not pay, a job running every minute gives the seat back.')
await step('Press Pay',
  'The server opens a payment session: Stripe Checkout when a Stripe key is in .env, otherwise this built-in TEST page (development only).',
  () => js(`__tour.click('Pay ')`))
await step('Test payment page · no real money. Press Pay',
  'Pay runs EXACTLY the same confirm code as a real Stripe webhook, and it is idempotent: the same message twice never confirms twice.',
  () => js(`__tour.click('Pay ')`))
await sleep(2500)
await step('Payment received → booking CONFIRMED on the server',
  'The success page asks the server until it says CONFIRMED: the server decides, never the browser.',
  () => js(`__tour.click('Show my ticket')`))
await step('The QR ticket',
  'Each booking gets a unique ticket code (EVH-…) drawn as a QR code by the server (ZXing). Later in this tour a volunteer scans it at the gate.')
await go('/my-tickets')
await step('My tickets: all of Ravi\'s bookings from the database',
  'Upcoming / Past / Cancelled tabs. A booking waiting for payment shows "Pay now"; a paid one can be cancelled (seats back + refund).')

// ---- Part 2b: after the event - certificates (Phase 7) ----
const ticketCode = await js(`fetch('/api/bookings/mine').then((r) => r.json())
  .then((all) => all.find((b) => b.event.id === ${tourEvent.id} && b.status === 'CONFIRMED')?.ticketCode)`)
await go('/certificates')
await step('Certificates: only for students who really came',
  'A certificate is made only when the ticket was scanned at the gate AND the event is over. Ravi attended "Linux Basics (demo)", so he has one.')
await go('/certificates/EH-2026-BEQR4Y79')
await step('The certificate (a PDF drawn by the server with OpenPDF)',
  'A random number (EH-2026-…) so nobody can guess other people’s certificates. Its QR code opens the public verify page.')

// ---- Part 2c: the gate - volunteer Priya scans Ravi's new ticket (Phase 7) ----
await logout()
await login('priya@eventhub.test')
await go(`/scanner?event=${tourEvent.id}`)
await step('Gate scanner: Priya (volunteer) scans Ravi’s ticket',
  'One database UPDATE "mark as used only if not used yet": even with 20 gates scanning at once, exactly one says LET IN.',
  async () => {
    await js(`__tour.type('ticket-code', ${JSON.stringify(ticketCode)})`)
    await sleep(400)
    await js(`__tour.click('Check')`)
  })
await step('The same ticket again → ALREADY USED',
  'A photo of someone else’s QR code does not work twice. The screen says when and by whom it was used. The live counter goes up.',
  async () => {
    await js(`__tour.type('ticket-code', ${JSON.stringify(ticketCode)})`)
    await sleep(400)
    await js(`__tour.click('Check')`)
  })
await logout()
await go('/verify/EH-2026-BEQR4Y79')
await step('Public verify page: anyone can check a certificate',
  'No login needed: a company reading a resume types the number and sees who, which event and when. A fake number says "not found".')

// ---- Part 3: organizer Madhavan creates an event ----
await logout()
await login('madhavan@eventhub.test')
await go('/organizer')
await step('Madhavan = ORGANIZER of the Coding Club',
  'Club roles live in the club_members table and are checked on EVERY request, so the menu now shows "Organizer" and "Scanner".')
await go('/organizer/events/new')
await step('Create a new event',
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
await step('Save and submit for approval',
  'The event is saved as DRAFT, then moves to PENDING_APPROVAL. Students cannot see it yet. The audit log records who did it.',
  () => js(`__tour.click('Save and submit')`))
await go('/organizer/analytics')
await step('Organizer analytics: sales, check-ins and ratings',
  'Tickets and money per day (Recharts), check-in rate and average stars. The server counts with GROUP BY and keeps the answer 60 s (@Cacheable).')
await go('/organizer/events/36/feedback')
await step('Feedback: stars and comments, without names',
  'Only students who came may rate, after the event. Organizers see the average and the comments, but never who wrote them.')

// ---- Part 4: admin approves ----
await logout()
await login('admin@eventhub.test')
await go('/admin/approvals')
await step('Admin: the approval queue',
  'Only accounts with the ADMIN role may open this page, and the server checks the same rule on every call (/api/admin/**).',
  () => js(`__tour.clickIn(${JSON.stringify(newEvent)}, 'Approve')`))
await step('Confirm the approval',
  'PENDING_APPROVAL → PUBLISHED. From this moment students can find and book it.',
  () => js(`__tour.inDialog('Approve')`))
await go('/admin/analytics')
await step('Admin analytics: all clubs together',
  'The same dashboard for the whole college, with a club filter. Only the admin can open it.')
await go('/admin')
await step('Admin overview + Activity log',
  'Totals per club come from one GROUP BY query. The Activity log (audit_log table) shows WHO created, submitted and approved each event.')

// ---- Part 5: security ----
await logout()
await login('kavya@eventhub.test')
await go('/admin')
await step('Security: Kavya (Cultural Club organizer) tries the admin area',
  'Blocked. Even if she called the API directly, the server answers 403 Forbidden. The page only hides things; the SERVER protects them.')
await go('/events')
await step('End of the tour',
  'Visitor → booking and payment → QR ticket → gate scan → certificate → organizer analytics → admin approval → security. EventHub, working together. 🎉')

console.log('NEW EVENT:', newEvent)
ws.close()
process.exit(0)
