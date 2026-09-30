// EventHub project presentation - built with pptxgenjs
const pptxgen = require('pptxgenjs')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const sharp = require('sharp')
const fa = require('react-icons/fa')

const OUT = process.argv[2]
const SHOTS = 'D:/Java_FullStack_Journey/02_EventHub_Practice_Project/Showcase/screenshots/'

// palette: EventHub indigo dominates, amber is the one sharp accent (the "ticket" colour)
const C = {
  night: '1E1B4B', // indigo-950: title / closing background, headings
  brand: '4F46E5', // indigo-600
  soft: 'EEF2FF', // indigo-50: card tint
  mid: 'C7D2FE', // indigo-200
  amber: 'F59E0B',
  amberSoft: 'FEF3C7',
  ink: '1F2937', // body text
  muted: '6B7280',
  white: 'FFFFFF',
  green: '15803D',
  red: 'B91C1C',
}
const HEAD = 'Arial'
const BODY = 'Calibri'
const W = 13.333
const SHOT_RATIO = 1738 / 680

async function icon(Comp, color = C.white, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: '#' + color, size: String(size) }))
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  return 'image/png;base64,' + png.toString('base64')
}

async function main() {
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_WIDE'
  pres.author = 'Madhavan Suresh'
  pres.title = 'EventHub - College Event Management Platform'

  let n = 0
  const footer = (s, dark = false) => {
    n++
    s.addText(`EventHub  ·  ${n}`, { x: W - 2.6, y: 7.05, w: 2.1, h: 0.3, fontFace: BODY, fontSize: 10, color: dark ? C.mid : C.muted, align: 'right', margin: 0, isTextBox: true })
  }
  const title = (s, text, sub) => {
    s.addText(text, { x: 0.6, y: 0.35, w: W - 1.2, h: 0.75, fontFace: HEAD, fontSize: 32, bold: true, color: C.night, margin: 0, isTextBox: true })
    if (sub) s.addText(sub, { x: 0.6, y: 1.1, w: W - 1.2, h: 0.4, fontFace: BODY, fontSize: 16, color: C.muted, margin: 0, isTextBox: true })
  }
  // screenshot in a rounded "device" frame: the repeated visual motif
  const shot = (s, file, x, y, w) => {
    const h = w / SHOT_RATIO
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, rectRadius: 0.12, fill: { color: C.night }, line: { color: C.night },
      shadow: { type: 'outer', color: '000000', opacity: 0.25, blur: 8, offset: 3, angle: 90 } })
    s.addImage({ path: SHOTS + file + '.png', x, y, w, h, rounding: false })
    return h
  }
  const circleIcon = async (s, Comp, x, y, d = 0.62, bg = C.brand, fg = C.white) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { color: bg } })
    s.addImage({ data: await icon(Comp, fg), x: x + d * 0.24, y: y + d * 0.24, w: d * 0.52, h: d * 0.52 })
  }
  const card = (s, x, y, w, h, fill = C.soft) =>
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill } })

  // ---------- 1. Title ----------
  {
    const s = pres.addSlide(); s.background = { color: C.night }
    await circleIcon(s, fa.FaTicketAlt, 0.7, 0.8, 0.9, C.amber, C.night)
    s.addText('EventHub', { x: 0.7, y: 1.95, w: 6, h: 1.1, fontFace: HEAD, fontSize: 58, bold: true, color: C.white, margin: 0, isTextBox: true })
    s.addText('College Event Management Platform', { x: 0.7, y: 3.05, w: 6, h: 0.6, fontFace: HEAD, fontSize: 24, color: C.mid, margin: 0, isTextBox: true })
    s.addText('Find, book, pay, enter with a QR ticket, get a certificate - all in one place.', { x: 0.7, y: 3.8, w: 5.6, h: 0.8, fontFace: BODY, fontSize: 16, color: C.white, margin: 0, isTextBox: true })
    s.addText([
      { text: 'Java Full Stack project  ·  React + Spring Boot + MySQL', options: { breakLine: true } },
      { text: 'Madhavan Suresh  ·  September 2026' },
    ], { x: 0.7, y: 5.6, w: 6, h: 0.8, fontFace: BODY, fontSize: 14, color: C.mid, margin: 0, isTextBox: true })
    shot(s, '01-home', 6.9, 2.2, 5.8)
    footer(s, true)
    s.addNotes('Good morning. My project is EventHub, a website where a college runs all its events: students find events, book and pay, enter with a QR ticket and get a certificate. I built it with React for the screens, Spring Boot for the server and MySQL for the data.')
  }

  // ---------- 2. Problem ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'The problem', 'Today most college events run on WhatsApp groups and Google Forms')
    const probs = [
      [fa.FaUsers, 'Overbooking', 'Two students fill the form for the last seat - both think they are in.'],
      [fa.FaTicketAlt, 'Fake entries', 'A screenshot of a ticket is shared; nobody can tell who already entered.'],
      [fa.FaCertificate, 'Late certificates', 'Made by hand weeks later, and easy to fake on a resume.'],
      [fa.FaChartBar, 'No insight', 'Organizers cannot see sales, attendance or what students thought.'],
    ]
    for (let i = 0; i < probs.length; i++) {
      const y = 1.85 + i * 1.2
      await circleIcon(s, probs[i][0], 0.6, y, 0.7, C.amberSoft, C.amber)
      s.addText(probs[i][1], { x: 1.55, y: y - 0.02, w: 5.3, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.night, margin: 0, isTextBox: true })
      s.addText(probs[i][2], { x: 1.55, y: y + 0.38, w: 5.3, h: 0.5, fontFace: BODY, fontSize: 14, color: C.ink, margin: 0, isTextBox: true })
    }
    card(s, 7.4, 1.85, 5.3, 4.5, C.night)
    s.addText('The solution', { x: 7.8, y: 2.15, w: 4.6, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: C.amber, margin: 0, isTextBox: true })
    s.addText('EventHub puts the whole journey in one place', { x: 7.8, y: 2.6, w: 4.6, h: 0.9, fontFace: HEAD, fontSize: 22, bold: true, color: C.white, margin: 0, isTextBox: true })
    s.addText([
      { text: 'Find', options: { bullet: true, breakLine: true } },
      { text: 'Book and pay (seat held 10 minutes)', options: { bullet: true, breakLine: true } },
      { text: 'Enter with a one-time QR ticket', options: { bullet: true, breakLine: true } },
      { text: 'Get a verifiable PDF certificate', options: { bullet: true, breakLine: true } },
      { text: 'Give feedback - organizers see analytics', options: { bullet: true } },
    ], { x: 7.8, y: 3.6, w: 4.6, h: 2.5, fontFace: BODY, fontSize: 15, color: C.mid, paraSpaceAfter: 6, margin: 0, isTextBox: true })
    footer(s)
    s.addNotes('Most colleges manage events with WhatsApp and Google Forms. That causes four problems: two people get the same last seat, ticket screenshots are shared, certificates come late and can be faked, and organizers have no numbers. EventHub solves all four in one website.')
  }

  // ---------- 3. Objectives ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Objectives', 'What the project had to achieve')
    const obj = [
      [fa.FaSearch, 'Easy discovery', 'Search and filter events by text, tag, club and date - on the server, with paging.'],
      [fa.FaChair, 'Fair booking', 'Never sell more seats than exist, even when 100 students click at the same second.'],
      [fa.FaListOl, 'Smart waitlist', 'Freed seats are offered automatically to the next student in the queue.'],
      [fa.FaQrcode, 'Fast, safe entry', 'QR tickets checked at the gate; each ticket works exactly once.'],
      [fa.FaAward, 'Proof of attendance', 'PDF certificates only for students who came, verifiable by anyone.'],
      [fa.FaChartLine, 'Insight', 'Ratings, check-in rate and sales charts for organizers and the admin.'],
    ]
    for (let i = 0; i < obj.length; i++) {
      const col = i % 3, row = Math.floor(i / 3)
      const x = 0.6 + col * 4.1, y = 1.8 + row * 2.5
      card(s, x, y, 3.8, 2.2)
      await circleIcon(s, obj[i][0], x + 0.3, y + 0.3, 0.62)
      s.addText(obj[i][1], { x: x + 1.1, y: y + 0.35, w: 2.5, h: 0.55, fontFace: HEAD, fontSize: 17, bold: true, color: C.night, margin: 0, valign: 'middle', isTextBox: true })
      s.addText(obj[i][2], { x: x + 0.3, y: y + 1.1, w: 3.25, h: 0.95, fontFace: BODY, fontSize: 14, color: C.ink, margin: 0, isTextBox: true })
    }
    footer(s)
    s.addNotes('I set six objectives: easy discovery, fair booking that never oversells, a smart waitlist, fast and safe entry with QR codes, certificates only for people who really came, and useful numbers for organizers.')
  }

  // ---------- 4. Users and roles ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Who uses EventHub', 'Five kinds of users - the server checks the role on every request')
    const roles = [
      [fa.FaUserAlt, 'Visitor', ['Browse and search events', 'Verify a certificate', 'Register']],
      [fa.FaUserGraduate, 'Student', ['Book and pay', 'QR tickets, waitlist', 'Certificates, feedback']],
      [fa.FaUserTie, 'Organizer', ['Create events for their club', 'Submit for approval', 'Analytics, feedback']],
      [fa.FaUserShield, 'Volunteer', ['Gate duty for their club', 'Scan QR tickets', 'Live check-in counter']],
      [fa.FaUserCog, 'Admin', ['Approve or send back events', 'All-club analytics', 'Activity (audit) log']],
    ]
    for (let i = 0; i < roles.length; i++) {
      const x = 0.6 + i * 2.47
      card(s, x, 1.85, 2.25, 4.0, i === 4 ? C.night : C.soft)
      await circleIcon(s, roles[i][0], x + 0.75, 2.15, 0.75, i === 4 ? C.amber : C.brand, i === 4 ? C.night : C.white)
      s.addText(roles[i][1], { x: x + 0.15, y: 3.05, w: 1.95, h: 0.45, fontFace: HEAD, fontSize: 18, bold: true, color: i === 4 ? C.white : C.night, align: 'center', margin: 0, isTextBox: true })
      s.addText(roles[i][2].map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < 2 } })),
        { x: x + 0.15, y: 3.65, w: 1.98, h: 2.5, fontFace: BODY, fontSize: 13.5, color: i === 4 ? C.mid : C.ink, paraSpaceAfter: 8, margin: 0, valign: 'top', isTextBox: true })
    }
    footer(s)
    s.addNotes('There are five kinds of users. A visitor only browses. A student books and gets tickets and certificates. An organizer runs events for one club. A volunteer scans tickets at the gate. The admin approves events and sees everything. The page hides buttons, but the server is what really protects each action.')
  }

  // ---------- 5. At a glance ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'The project at a glance', 'Built step by step in 10 phases, with every change tested on GitHub')
    const stats = [['29', 'pages (routes)'], ['50', 'REST API endpoints'], ['17', 'database tables'], ['146', 'automated tests'], ['91%', 'service test coverage'], ['60+', 'Git commits']]
    for (let i = 0; i < stats.length; i++) {
      const col = i % 3, row = Math.floor(i / 3)
      const x = 0.6 + col * 4.1, y = 1.85 + row * 2.45
      card(s, x, y, 3.8, 2.15, row === 0 ? C.soft : C.amberSoft)
      s.addText(stats[i][0], { x: x + 0.3, y: y + 0.3, w: 3.2, h: 1.0, fontFace: HEAD, fontSize: 60, bold: true, color: row === 0 ? C.brand : C.night, margin: 0, isTextBox: true })
      s.addText(stats[i][1], { x: x + 0.3, y: y + 1.4, w: 3.2, h: 0.5, fontFace: BODY, fontSize: 16, color: C.ink, margin: 0, isTextBox: true })
    }
    footer(s)
    s.addNotes('Some numbers: 29 pages, 50 API endpoints, 17 database tables, 146 automated tests with 91 percent coverage of the business logic, and more than 60 commits on GitHub. About 6,600 lines of Java, 6,000 lines of React and 3,400 lines of tests.')
  }

  // ---------- 6. Tech stack ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Technologies used', 'Current, industry-standard tools')
    const cols = [
      [fa.FaReact, 'Frontend', ['React 19 + Vite 8', 'Tailwind CSS 4 (dark mode)', 'Redux Toolkit', 'React Router 7', 'Recharts (charts)', 'html5-qrcode (camera)']],
      [fa.FaJava, 'Backend', ['Java 25, Spring Boot 4.1', 'Spring Security + JWT', 'Spring Data JPA / Hibernate', 'Flyway migrations', 'ZXing (QR), OpenPDF', 'Caffeine cache, Spring Mail']],
      [fa.FaDatabase, 'Data & services', ['MySQL 8.4', 'Docker Compose', 'Mailpit (test email)', 'Stripe Checkout (test mode)', 'Swagger / OpenAPI docs']],
      [fa.FaCheckCircle, 'Quality & tools', ['JUnit 5 + Mockito', 'Testcontainers (real MySQL)', 'JaCoCo coverage', 'Vitest + Testing Library', 'GitHub Actions CI', 'Postman, IntelliJ, Git']],
    ]
    for (let i = 0; i < cols.length; i++) {
      const x = 0.6 + i * 3.1
      card(s, x, 1.8, 2.85, 4.35)
      await circleIcon(s, cols[i][0], x + 0.25, 2.05, 0.62)
      s.addText(cols[i][1], { x: x + 1.0, y: 2.1, w: 1.75, h: 0.52, fontFace: HEAD, fontSize: 17, bold: true, color: C.night, margin: 0, valign: 'middle', isTextBox: true })
      s.addText(cols[i][2].map((t, k, a) => ({ text: t, options: { bullet: true, breakLine: k < a.length - 1 } })),
        { x: x + 0.25, y: 2.9, w: 2.45, h: 3.5, fontFace: BODY, fontSize: 14, color: C.ink, paraSpaceAfter: 7, margin: 0, valign: 'top', isTextBox: true })
    }
    footer(s)
    s.addNotes('The frontend is React with Tailwind for styling and Redux for shared state. The backend is Spring Boot on Java 25 with Spring Security. Data is in MySQL, running in Docker. For quality I used JUnit, Mockito, Testcontainers and Vitest, and GitHub Actions runs every test on every push.')
  }

  // ---------- 7. Architecture ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Architecture', 'A single-page React app talks to a layered Spring Boot API')
    const box = (x, y, w, h, fill, line, text, sub, dark) => {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.1, fill: { color: fill }, line: { color: line, width: 1 } })
      s.addText([{ text, options: { bold: true, fontSize: 15, breakLine: !!sub } }, ...(sub ? [{ text: sub, options: { fontSize: 11.5 } }] : [])],
        { x, y, w, h, fontFace: BODY, color: dark ? C.white : C.night, align: 'center', valign: 'middle', margin: 4, isTextBox: true })
    }
    const arrow = (x1, y1, x2, y2) => s.addShape(pres.shapes.LINE, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color: C.muted, width: 1.5, endArrowType: 'triangle' } })
    box(0.6, 3.0, 2.6, 1.6, C.soft, C.brand, 'Browser', 'React 19 app\nRedux store · Axios')
    arrow(3.25, 3.8, 4.2, 3.8)
    s.addText('JSON over HTTP · JWT cookie + CSRF token', { x: 0.6, y: 4.7, w: 2.6, h: 0.5, fontFace: BODY, fontSize: 10.5, color: C.muted, align: 'center', margin: 0, isTextBox: true })
    // Spring Boot container
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.25, y: 1.75, w: 4.9, h: 4.85, rectRadius: 0.12, fill: { color: C.white }, line: { color: C.night, width: 1.5, dashType: 'dash' } })
    s.addText('Spring Boot API (port 8080)', { x: 4.25, y: 1.82, w: 4.9, h: 0.4, fontFace: HEAD, fontSize: 14, bold: true, color: C.night, align: 'center', margin: 0, isTextBox: true })
    box(4.55, 2.3, 4.3, 0.75, C.amberSoft, C.amber, 'Security filters', 'JWT cookie reader · CSRF · role rules')
    box(4.55, 3.25, 4.3, 0.75, C.soft, C.brand, 'Controllers', '50 REST endpoints · validation')
    box(4.55, 4.2, 4.3, 0.75, C.soft, C.brand, 'Services', 'business rules · transactions · events')
    box(4.55, 5.15, 4.3, 0.75, C.soft, C.brand, 'Repositories', 'Spring Data JPA · Hibernate')
    arrow(6.7, 3.05, 6.7, 3.25); arrow(6.7, 4.0, 6.7, 4.2); arrow(6.7, 4.95, 6.7, 5.15)
    box(10.1, 4.95, 2.6, 1.15, C.night, C.night, 'MySQL 8.4', '17 tables · Flyway V1-V9', true)
    arrow(8.85, 5.5, 10.05, 5.5)
    box(10.1, 1.9, 2.6, 0.95, C.soft, C.brand, 'Stripe', 'checkout + webhook')
    box(10.1, 3.1, 2.6, 0.95, C.soft, C.brand, 'Mail server', 'Mailpit in development')
    arrow(8.85, 2.4, 10.05, 2.4); arrow(8.85, 3.55, 10.05, 3.55)
    box(0.6, 5.55, 2.6, 0.9, C.amberSoft, C.amber, 'GitHub Actions', 'tests on every push')
    footer(s)
    s.addNotes('The browser runs the React app. It sends JSON requests to the Spring Boot server. Each request first passes the security filters, which read the login cookie and check the CSRF token. Then a controller receives it, a service applies the business rules inside a database transaction, and a repository reads or writes MySQL. The server also talks to Stripe for payments and to a mail server for emails.')
  }

  // ---------- 8. Modules ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Backend modules', 'One Java package per business area - easy to find and to test')
    const mods = [
      ['event', 'Create, edit, search, approval workflow'], ['booking', 'Seat holds, confirm, cancel, expiry job'],
      ['payment', 'Stripe or test gateway, webhooks, refunds'], ['waitlist', 'Queue, 30-minute seat offers'],
      ['notification', 'In-app bell, emails, reminders'], ['gate', 'QR images, check-in, live counter'],
      ['certificate', 'PDF certificates, public verify'], ['feedback', 'Stars and anonymous comments'],
      ['analytics', 'Charts data, 60-second cache'], ['auth', 'Register, login, JWT, club roles'],
      ['audit', 'Who did what, and when'], ['club · tag · user', 'Clubs, tags, users, profiles'],
    ]
    for (let i = 0; i < mods.length; i++) {
      const col = i % 3, row = Math.floor(i / 3)
      const x = 0.6 + col * 4.1, y = 1.8 + row * 1.2
      card(s, x, y, 3.8, 1.0, row % 2 === 0 ? C.soft : C.white)
      if (row % 2 === 1) s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.8, h: 1.0, rectRadius: 0.12, fill: { color: C.white }, line: { color: C.mid, width: 1 } })
      s.addText(mods[i][0], { x: x + 0.25, y: y + 0.12, w: 3.3, h: 0.38, fontFace: 'Courier New', fontSize: 15, bold: true, color: C.brand, margin: 0, isTextBox: true })
      s.addText(mods[i][1], { x: x + 0.25, y: y + 0.52, w: 3.3, h: 0.38, fontFace: BODY, fontSize: 13, color: C.ink, margin: 0, isTextBox: true })
    }
    footer(s)
    s.addNotes('The backend is split into packages by business area, not by technical layer. So everything about bookings is in the booking package: the entity, repository, service and controller. This makes the code easy to find and to test.')
  }

  // ---------- 9. Database ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Database design', '17 MySQL tables, created and changed only through Flyway migrations (V1-V9)')
    const groups = [
      [fa.FaUsers, 'People & clubs', 'users, roles, user_roles, profiles, clubs, club_members'],
      [fa.FaCalendarAlt, 'Events', 'events, tags, event_tags, audit_log'],
      [fa.FaMoneyBillWave, 'Bookings & money', 'bookings, payments, processed_payment_events, waitlist_entries'],
      [fa.FaAward, 'After the event', 'notifications, certificates, feedback'],
    ]
    for (let i = 0; i < groups.length; i++) {
      const y = 1.8 + i * 1.18
      await circleIcon(s, groups[i][0], 0.6, y + 0.12, 0.62)
      s.addText(groups[i][1], { x: 1.45, y: y + 0.02, w: 4.9, h: 0.4, fontFace: HEAD, fontSize: 17, bold: true, color: C.night, margin: 0, isTextBox: true })
      s.addText(groups[i][2], { x: 1.45, y: y + 0.45, w: 4.9, h: 0.6, fontFace: 'Courier New', fontSize: 12.5, color: C.ink, margin: 0, isTextBox: true })
    }
    card(s, 6.9, 1.8, 5.8, 4.65, C.night)
    s.addText('Design rules that keep the data correct', { x: 7.25, y: 2.05, w: 5.1, h: 0.5, fontFace: HEAD, fontSize: 17, bold: true, color: C.amber, margin: 0, isTextBox: true })
    s.addText([
      { text: 'events.available_seats is the ONE seat counter; a @Version column stops two saves from overwriting each other', options: { bullet: true, breakLine: true } },
      { text: 'UNIQUE keys stop duplicates: one certificate and one rating per ticket, one webhook message processed once', options: { bullet: true, breakLine: true } },
      { text: 'CHECK constraints: status values, 1-5 stars, 1-10 tickets', options: { bullet: true, breakLine: true } },
      { text: 'Random codes (EVH-..., EH-2026-...) so nobody can guess other tickets or certificates', options: { bullet: true, breakLine: true } },
      { text: 'Tests run on their own fresh MySQL (Testcontainers)', options: { bullet: true } },
    ], { x: 7.25, y: 2.65, w: 5.15, h: 3.6, fontFace: BODY, fontSize: 14, color: C.white, paraSpaceAfter: 8, margin: 0, valign: 'top', isTextBox: true })
    footer(s)
    s.addNotes('There are 17 tables in four groups. The tables are never changed by hand: every change is a numbered Flyway migration file, V1 to V9, so every laptop and server has exactly the same database. Constraints in the database itself stop wrong data, for example a rating of 6 stars or the same ticket rated twice.')
  }

  // ---------- 10. Event workflow ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Workflow 1: an event from idea to published', 'A small state machine - illegal moves are refused by the server')
    const steps = [['DRAFT', 'Organizer creates and edits', C.soft, C.night], ['PENDING APPROVAL', 'Submitted - cannot be edited', C.amberSoft, C.night], ['PUBLISHED', 'Visible and bookable', C.night, C.white]]
    for (let i = 0; i < 3; i++) {
      const x = 0.6 + i * 4.25
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.85, w: 3.55, h: 1.25, rectRadius: 0.12, fill: { color: steps[i][2] }, line: { color: steps[i][2] } })
      s.addText([{ text: steps[i][0], options: { bold: true, fontSize: 17, breakLine: true } }, { text: steps[i][1], options: { fontSize: 13 } }],
        { x, y: 1.85, w: 3.55, h: 1.25, fontFace: BODY, color: steps[i][3], align: 'center', valign: 'middle', margin: 4, isTextBox: true })
      if (i < 2) s.addShape(pres.shapes.LINE, { x: x + 3.6, y: 2.47, w: 0.6, h: 0, line: { color: C.brand, width: 2, endArrowType: 'triangle' } })
    }
    s.addText('submit', { x: 4.1, y: 2.0, w: 0.8, h: 0.3, fontFace: BODY, fontSize: 11, color: C.muted, align: 'center', margin: 0, isTextBox: true })
    s.addText('approve', { x: 8.35, y: 2.0, w: 0.8, h: 0.3, fontFace: BODY, fontSize: 11, color: C.muted, align: 'center', margin: 0, isTextBox: true })
    s.addText('Admin sends back with a reason → back to DRAFT, the organizer sees the note', { x: 0.6, y: 3.25, w: 8, h: 0.4, fontFace: BODY, fontSize: 14, italic: true, color: C.red, margin: 0, isTextBox: true })
    const h = shot(s, '23-approve-dialog', 0.6, 3.95, 6.9)
    s.addText([
      { text: 'Every change is written to the audit log (who, what, when)', options: { bullet: true, breakLine: true } },
      { text: 'The event row has a version number: two admins clicking at once cannot both win', options: { bullet: true, breakLine: true } },
      { text: 'Only organizers of THAT club may edit its events', options: { bullet: true } },
    ], { x: 7.9, y: 3.95, w: 4.8, h: h, fontFace: BODY, fontSize: 14, color: C.ink, paraSpaceAfter: 8, margin: 0, valign: 'top', isTextBox: true })
    footer(s)
    s.addNotes('An event starts as a draft. The organizer submits it, and while it waits for approval it cannot be edited. The admin either approves it, and it becomes public, or sends it back with a reason. The server refuses any other move, and every step is recorded in the audit log.')
  }

  // ---------- 11. Booking journey ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Workflow 2: the student journey', 'From finding an event to getting a certificate')
    const j = [
      [fa.FaSearch, 'Find', 'search, filter'], [fa.FaHourglassHalf, 'Hold', 'seats kept 10 min'], [fa.FaCreditCard, 'Pay', 'Stripe / test page'],
      [fa.FaQrcode, 'QR ticket', 'booking confirmed'], [fa.FaDoorOpen, 'Gate', 'scanned once'], [fa.FaAward, 'Certificate', 'PDF after event'], [fa.FaStar, 'Feedback', '1-5 stars'],
    ]
    for (let i = 0; i < j.length; i++) {
      const x = 0.6 + i * 1.78
      await circleIcon(s, j[i][0], x + 0.35, 2.0, 0.95, i === 4 ? C.amber : C.brand, i === 4 ? C.night : C.white)
      s.addText(j[i][1], { x, y: 3.1, w: 1.65, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: C.night, align: 'center', margin: 0, isTextBox: true })
      s.addText(j[i][2], { x, y: 3.5, w: 1.65, h: 0.35, fontFace: BODY, fontSize: 12.5, color: C.muted, align: 'center', margin: 0, isTextBox: true })
      if (i < j.length - 1) s.addShape(pres.shapes.LINE, { x: x + 1.38, y: 2.47, w: 0.34, h: 0, line: { color: C.mid, width: 2, endArrowType: 'triangle' } })
    }
    card(s, 0.6, 4.3, 12.1, 2.2, C.soft)
    s.addText('What happens if...', { x: 0.95, y: 4.5, w: 6, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: C.night, margin: 0, isTextBox: true })
    s.addText([
      { text: 'the event is sold out? → join the waitlist ("You are #3"). When someone cancels, the seats are kept 30 minutes for the next student, who gets an email and a bell notification.', options: { bullet: true, breakLine: true } },
      { text: 'the student does not pay? → a job running every minute frees the held seats after 10 minutes.', options: { bullet: true, breakLine: true } },
      { text: 'the payment arrives after the hold ran out? → the seats are taken again if still free, otherwise the money is refunded.', options: { bullet: true } },
    ], { x: 0.95, y: 4.95, w: 11.4, h: 1.45, fontFace: BODY, fontSize: 13.5, color: C.ink, paraSpaceAfter: 4, margin: 0, valign: 'top', isTextBox: true })
    footer(s)
    s.addNotes('This is the student journey: find an event, hold the seats for ten minutes, pay, get a QR ticket, get scanned at the gate, receive a certificate after the event, and rate it. The bottom box shows the unhappy paths: a waitlist when it is sold out, automatic release when someone does not pay, and refunds for payments that arrive too late.')
  }

  // ---------- 12. Example: booking ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Example 1: Ravi books the 24-Hour Hackathon', 'Screens from the real running application')
    const items = [['05-event-details', '1. Live seat count, choose tickets'], ['07-checkout-hold', '2. Seat held - server-side timer'], ['11-qr-ticket', '3. Paid → QR ticket']]
    for (let i = 0; i < items.length; i++) {
      const x = 0.6 + i * 4.15
      const h = shot(s, items[i][0], x, 1.95, 3.85)
      s.addText(items[i][1], { x, y: 1.95 + h + 0.2, w: 3.85, h: 0.4, fontFace: HEAD, fontSize: 15, bold: true, color: C.night, margin: 0, isTextBox: true })
    }
    card(s, 0.6, 4.45, 12.1, 1.85, C.amberSoft)
    s.addText('Why two students can never get the same last seat', { x: 0.95, y: 4.65, w: 11.4, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: C.night, margin: 0, isTextBox: true })
    s.addText('Every save of an event carries its version number. If Ravi and Asha both read "1 seat left, version 7", the first save succeeds (version 8) and the second is refused and retried with fresh data - it now sees 0 seats. A test starts 100 threads for 10 seats: exactly 10 bookings succeed, every time. Without @Version the same test sold 96-99 tickets.',
      { x: 0.95, y: 5.1, w: 11.4, h: 1.1, fontFace: BODY, fontSize: 14, color: C.ink, margin: 0, valign: 'top', isTextBox: true })
    footer(s)
    s.addNotes('Here is a real booking. Ravi sees the live seat count, the seats are held for ten minutes while he pays, and after payment he gets a QR ticket. The key point is optimistic locking: the database refuses a save made with old data, so we can never sell the last seat twice. My test with 100 parallel threads proves it.')
  }

  // ---------- 13. Example: gate ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Example 2: the gate - each ticket works once', 'Volunteer Priya scans Ravi\'s QR code (camera or typed code)')
    const h1 = shot(s, '15-gate-let-in', 0.6, 1.9, 5.9)
    s.addText('First scan → LET IN', { x: 0.6, y: 1.9 + h1 + 0.15, w: 5.9, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: C.green, margin: 0, isTextBox: true })
    const h2 = shot(s, '16-gate-already-used', 6.8, 1.9, 5.9)
    s.addText('Same ticket again → ALREADY USED (when, by whom)', { x: 6.8, y: 1.9 + h2 + 0.15, w: 5.9, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: C.red, margin: 0, isTextBox: true })
    card(s, 0.6, 5.0, 12.1, 1.55, C.soft)
    s.addText([
      { text: 'One SQL statement does check-and-mark together: ', options: { bold: true } },
      { text: 'UPDATE bookings SET checked_in_at = now WHERE id = ? AND checked_in_at IS NULL', options: { fontFace: 'Courier New', color: C.brand } },
      { text: '. If it changed 1 row → VALID; 0 rows → someone was faster → ALREADY USED. A test with 20 gates scanning the same ticket at the same moment gets exactly one VALID.' },
    ], { x: 0.95, y: 5.2, w: 11.4, h: 1.2, fontFace: BODY, fontSize: 14, color: C.ink, margin: 0, valign: 'top', isTextBox: true })
    footer(s)
    s.addNotes('At the gate, the volunteer scans the QR code. The first scan says LET IN in green. The same ticket again says ALREADY USED in red, with the time and the volunteer name. The trick is one SQL update that only marks the ticket if it is not used yet, so even twenty gates at once cannot let the same ticket in twice.')
  }

  // ---------- 14. Example: certificate ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Example 3: certificates anyone can verify', 'Only for students who were scanned at the gate, after the event ends')
    const h1 = shot(s, '14-certificate', 0.6, 1.9, 5.9)
    s.addText('PDF drawn by the server (OpenPDF), with a QR code', { x: 0.6, y: 1.9 + h1 + 0.15, w: 5.9, h: 0.4, fontFace: HEAD, fontSize: 15, bold: true, color: C.night, margin: 0, isTextBox: true })
    const h2 = shot(s, '17-verify-public', 6.8, 1.9, 5.9)
    s.addText('Public verify page - no login needed', { x: 6.8, y: 1.9 + h2 + 0.15, w: 5.9, h: 0.4, fontFace: HEAD, fontSize: 15, bold: true, color: C.night, margin: 0, isTextBox: true })
    const pts = [[fa.FaLock, 'Random number EH-2026-BEQR4Y79 - cannot be guessed'], [fa.FaUserCheck, 'Checked-in + event over = certificate'], [fa.FaBuilding, 'A company checks it in seconds']]
    for (let i = 0; i < pts.length; i++) {
      const x = 0.6 + i * 4.1
      await circleIcon(s, pts[i][0], x, 5.45, 0.6)
      s.addText(pts[i][1], { x: x + 0.75, y: 5.4, w: 3.2, h: 0.7, fontFace: BODY, fontSize: 14, color: C.ink, margin: 0, valign: 'middle', isTextBox: true })
    }
    footer(s)
    s.addNotes('After the event, students who were really scanned at the gate can download a PDF certificate made by the server. Each certificate has a random number and a QR code. Anyone, for example a company reading a resume, can open the public verify page and see that it is genuine.')
  }

  // ---------- 15. Example: analytics ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Example 4: analytics for organizers and the admin', 'Tickets and money per day, check-in rate and average rating')
    const h = shot(s, '21-organizer-analytics', 0.6, 1.9, 7.4)
    s.addText([
      { text: 'Counted in the database', options: { bold: true, breakLine: true } },
      { text: 'JPQL GROUP BY, SUM and AVG - Java gets a few small rows, not every booking.', options: { breakLine: true } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Cached for 60 seconds', options: { bold: true, breakLine: true } },
      { text: '@Cacheable + Caffeine: repeated views do not touch MySQL. Seat counts are never cached.', options: { breakLine: true } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Drawn with Recharts', options: { bold: true, breakLine: true } },
      { text: 'Bar charts with hover tooltips, a table view for screen readers, light and dark colours checked for contrast.' },
    ], { x: 8.4, y: 1.9, w: 4.3, h: Math.max(h, 3.2), fontFace: BODY, fontSize: 14, color: C.ink, margin: 0, valign: 'top', isTextBox: true })
    footer(s)
    s.addNotes('Organizers get a dashboard with tickets and money per day, the percentage of ticket holders who actually came, and the average rating. The database does the counting with GROUP BY, and the result is cached for sixty seconds, so opening the dashboard many times does not load the database.')
  }

  // ---------- 16. Security ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Security', 'The page only hides buttons - the server protects every action')
    const sec = [
      [fa.FaKey, 'Passwords hashed with BCrypt', 'never stored as plain text'],
      [fa.FaCookieBite, 'JWT in an httpOnly cookie', 'JavaScript cannot read it, so a script cannot steal it'],
      [fa.FaShieldAlt, 'CSRF protection', 'other websites cannot send requests as you'],
      [fa.FaUserLock, 'Roles checked on every request', 'club roles read from the database each time → 403'],
      [fa.FaBan, 'Login lock', '5 wrong passwords → 15 minutes locked (HTTP 429)'],
      [fa.FaClipboardList, 'Audit log + admin-only tools', 'Swagger and Actuator for the admin only'],
    ]
    for (let i = 0; i < sec.length; i++) {
      const y = 1.8 + i * 0.8
      await circleIcon(s, sec[i][0], 0.6, y, 0.58)
      s.addText([{ text: sec[i][1], options: { bold: true, color: C.night, breakLine: true } }, { text: sec[i][2], options: { color: C.muted } }],
        { x: 1.35, y: y - 0.06, w: 5.6, h: 0.72, fontFace: BODY, fontSize: 14, margin: 0, valign: 'middle', isTextBox: true })
    }
    const h = shot(s, '27-security-blocked', 7.3, 1.9, 5.4)
    s.addText('Kavya (organizer of another club) opens the admin area: blocked. The API answers 403 Forbidden too.', { x: 7.3, y: 1.9 + h + 0.2, w: 5.4, h: 0.8, fontFace: BODY, fontSize: 14, italic: true, color: C.ink, margin: 0, isTextBox: true })
    footer(s)
    s.addNotes('Security was built in from Phase 5. Passwords are hashed with BCrypt. The login token is a JWT inside an httpOnly cookie, which scripts cannot read. CSRF tokens stop other websites from acting as you. Every request is checked for the right role, and after five wrong passwords the account is locked for fifteen minutes.')
  }

  // ---------- 17. Testing ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Testing and quality', 'Every push to GitHub runs all tests automatically (GitHub Actions)')
    const big = [['133', 'backend tests'], ['13', 'React tests'], ['91%', 'service coverage']]
    for (let i = 0; i < big.length; i++) {
      const y = 1.8 + i * 1.55
      card(s, 0.6, y, 3.6, 1.35, i === 2 ? C.amberSoft : C.soft)
      s.addText(big[i][0], { x: 0.9, y: y + 0.12, w: 3.1, h: 0.8, fontFace: HEAD, fontSize: 44, bold: true, color: i === 2 ? C.night : C.brand, margin: 0, isTextBox: true })
      s.addText(big[i][1], { x: 0.9, y: y + 0.88, w: 3.1, h: 0.35, fontFace: BODY, fontSize: 14, color: C.ink, margin: 0, isTextBox: true })
    }
    const pk = [['booking', 88], ['auth', 86], ['payment', 81], ['gate', 91], ['waitlist', 97], ['notification', 97], ['certificate', 98], ['event', 98], ['feedback', 100], ['analytics', 100]]
    s.addChart(pres.charts.BAR, [{ name: 'Line coverage %', labels: pk.map((p) => p[0]), values: pk.map((p) => p[1]) }], {
      x: 4.6, y: 1.7, w: 8.1, h: 4.8, barDir: 'bar', chartColors: [C.brand],
      showTitle: true, title: 'Line coverage by module (JaCoCo)', titleFontFace: HEAD, titleFontSize: 14, titleColor: C.night,
      showValue: true, dataLabelPosition: 'inEnd', dataLabelFontSize: 10, dataLabelColor: C.white, dataLabelFormatCode: '0"%"',
      valAxisMaxVal: 100, valAxisMinVal: 0, valAxisLabelColor: C.muted, catAxisLabelColor: C.ink, catAxisLabelFontSize: 11,
      valGridLine: { color: 'E5E7EB', size: 0.5 }, catGridLine: { style: 'none' }, showLegend: false, barGapWidthPct: 60,
    })
    footer(s)
    s.addNotes('Testing is a big part of the project. There are 133 backend tests: unit tests with Mockito, and integration tests that start a real MySQL in Docker with Testcontainers. There are 13 React tests with Vitest. Coverage of the business logic is 91 percent. The tests also found real bugs, like a scanner crash and a test that failed one time in sixteen.')
  }

  // ---------- 18. Challenges ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Hard problems solved', 'The lessons I would explain in an interview')
    const ch = [
      ['Last seat race', '100 students, 10 seats', 'Optimistic locking (@Version) + automatic retry'],
      ['MySQL deadlock', 'two transactions waiting on each other', 'Always update the event row first, then insert the booking'],
      ['Emails for undone work', 'mail sent, then the change rolled back', 'Save the message in the same transaction; send only after commit'],
      ['Stale snapshot', 'REPEATABLE READ kept showing "unused"', 'Answer from the UPDATE result instead of reading again'],
      ['Flaky JWT test', 'failed 1 run in 16', 'The last base64 letter has 2 unused bits - change the first letter'],
      ['Blank scanner page', 'crash after a refactor', 'Found by the demo tour; added a page test and a lint rule'],
    ]
    for (let i = 0; i < ch.length; i++) {
      const col = i % 3, row = Math.floor(i / 3)
      const x = 0.6 + col * 4.1, y = 1.8 + row * 2.4
      card(s, x, y, 3.8, 2.15, row === 0 ? C.soft : C.amberSoft)
      s.addText(ch[i][0], { x: x + 0.3, y: y + 0.2, w: 3.2, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: C.night, margin: 0, isTextBox: true })
      s.addText(ch[i][1], { x: x + 0.3, y: y + 0.62, w: 3.2, h: 0.4, fontFace: BODY, fontSize: 12.5, italic: true, color: C.muted, margin: 0, isTextBox: true })
      s.addText('Fix: ' + ch[i][2], { x: x + 0.3, y: y + 1.05, w: 3.25, h: 0.95, fontFace: BODY, fontSize: 13.5, color: C.ink, margin: 0, valign: 'top', isTextBox: true })
    }
    footer(s)
    s.addNotes('These are the hardest problems I met. Each one is a real bug that I found with a test or a demo, understood, and fixed. For example, a MySQL deadlock between two bookings was solved by always updating the event row first, and emails are now sent only after the database change is committed.')
  }

  // ---------- 19. Journey ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'How it was built: 10 phases', 'Each phase ended with "done when" checks before moving on')
    const ph = ['Java basics', 'Project setup', 'Backend API', 'Frontend', 'Connecting', 'Login & roles', 'Bookings & pay', 'Signature features', 'Testing & polish', 'Launch']
    s.addShape(pres.shapes.LINE, { x: 0.95, y: 3.35, w: 11.45, h: 0, line: { color: C.mid, width: 3 } })
    for (let i = 0; i < ph.length; i++) {
      const x = 0.6 + i * 1.27
      const done = i < 9
      s.addShape(pres.shapes.OVAL, { x: x + 0.1, y: 3.0, w: 0.7, h: 0.7, fill: { color: done ? C.brand : C.amber }, line: { color: C.white, width: 2 } })
      s.addText(String(i), { x: x + 0.1, y: 3.0, w: 0.7, h: 0.7, fontFace: HEAD, fontSize: 16, bold: true, color: done ? C.white : C.night, align: 'center', valign: 'middle', margin: 0, isTextBox: true })
      s.addText(ph[i], { x: x - 0.12, y: 3.85, w: 1.15, h: 0.8, fontFace: BODY, fontSize: 12.5, bold: true, color: C.night, align: 'center', valign: 'top', margin: 0, isTextBox: true })
    }
    s.addText('Phases 0-8 complete  ·  Phase 9 (deployment) next', { x: 0.6, y: 1.8, w: 12.1, h: 0.4, fontFace: BODY, fontSize: 15, color: C.muted, margin: 0, isTextBox: true })
    card(s, 0.6, 5.0, 12.1, 1.5, C.soft)
    s.addText([
      { text: 'Working style: ', options: { bold: true } },
      { text: 'small steps, each one tested and committed; every phase started from a written checklist; CI stayed green; a guided demo tour in Edge replays the whole journey (28 steps) and made the screenshots in this deck.' },
    ], { x: 0.95, y: 5.1, w: 11.4, h: 1.3, fontFace: BODY, fontSize: 15, color: C.ink, margin: 0, valign: 'middle', isTextBox: true })
    footer(s)
    s.addNotes('I built EventHub in ten phases, from Java basics to launch. Each phase had a checklist and "done when" tests, and I only moved on when they passed. Phases zero to eight are finished; the last phase is putting it online.')
  }

  // ---------- 20. Future scope ----------
  {
    const s = pres.addSlide(); s.background = { color: C.white }
    title(s, 'Future scope', 'What would come next in a real product')
    const fut = [
      [fa.FaCloudUploadAlt, 'Go live', 'Deploy backend, database and frontend (Phase 9)'],
      [fa.FaEnvelopeOpenText, 'Password reset', 'Reset link by email'],
      [fa.FaMobileAlt, 'Mobile / offline gate', 'Installable app that scans even with weak Wi-Fi'],
      [fa.FaRupeeSign, 'Indian payments', 'UPI through Razorpay next to Stripe'],
      [fa.FaServer, 'More servers', 'Redis for the login lock and cache'],
      [fa.FaUniversity, 'Many colleges', 'One platform, separate data per college'],
    ]
    for (let i = 0; i < fut.length; i++) {
      const col = i % 2, row = Math.floor(i / 2)
      const x = 0.6 + col * 6.15, y = 1.8 + row * 1.65
      card(s, x, y, 5.95, 1.45, col === 0 ? C.soft : C.amberSoft)
      await circleIcon(s, fut[i][0], x + 0.3, y + 0.4, 0.64, col === 0 ? C.brand : C.amber, col === 0 ? C.white : C.night)
      s.addText([{ text: fut[i][1], options: { bold: true, fontSize: 16, color: C.night, breakLine: true } }, { text: fut[i][2], options: { fontSize: 13.5, color: C.ink } }],
        { x: x + 1.2, y: y + 0.2, w: 4.5, h: 1.05, fontFace: BODY, margin: 0, valign: 'middle', isTextBox: true })
    }
    footer(s)
    s.addNotes('In the future I would deploy it, add password reset by email, an installable app for the gate that works offline, UPI payments, Redis so it can run on several servers, and support for many colleges.')
  }

  // ---------- 21. Photo (Madhavan's choice, just before the questions) ----------
  {
    const s = pres.addSlide(); s.background = { color: C.night }
    const w = 10.2, h = w * (388 / 647)
    const x = (W - w) / 2, y = (7.5 - h) / 2 - 0.1
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.1, y: y - 0.1, w: w + 0.2, h: h + 0.2, rectRadius: 0.15, fill: { color: C.amber }, line: { color: C.amber },
      shadow: { type: 'outer', color: '000000', opacity: 0.35, blur: 10, offset: 4, angle: 90 } })
    s.addImage({ path: 'D:/Java_FullStack_Journey/02_EventHub_Practice_Project/Showcase/photo.jpg', x, y, w, h, altText: 'Photo' })
    footer(s, true)
    s.addNotes('A light moment before the questions.')
  }

  // ---------- 22. Conclusion ----------
  {
    const s = pres.addSlide(); s.background = { color: C.night }
    s.addText('Conclusion', { x: 0.7, y: 0.7, w: 6, h: 0.8, fontFace: HEAD, fontSize: 40, bold: true, color: C.white, margin: 0, isTextBox: true })
    const take = [
      'A complete, working full stack product - not just screens: payments, QR entry, PDFs, emails, charts.',
      'Correct under pressure: no overselling, no double entry, no emails for undone work.',
      'Professional practice: security, 146 automated tests, CI, clean modules and documentation.',
    ]
    for (let i = 0; i < take.length; i++) {
      const y = 1.9 + i * 1.3
      s.addShape(pres.shapes.OVAL, { x: 0.7, y, w: 0.6, h: 0.6, fill: { color: C.amber }, line: { color: C.amber } })
      s.addText(String(i + 1), { x: 0.7, y, w: 0.6, h: 0.6, fontFace: HEAD, fontSize: 18, bold: true, color: C.night, align: 'center', valign: 'middle', margin: 0, isTextBox: true })
      s.addText(take[i], { x: 1.55, y: y - 0.1, w: 5.4, h: 0.95, fontFace: BODY, fontSize: 16, color: C.white, margin: 0, valign: 'middle', isTextBox: true })
    }
    s.addText('Thank you', { x: 7.6, y: 2.2, w: 5, h: 1.0, fontFace: HEAD, fontSize: 48, bold: true, color: C.amber, align: 'center', margin: 0, isTextBox: true })
    s.addText('Questions?', { x: 7.6, y: 3.2, w: 5, h: 0.6, fontFace: HEAD, fontSize: 26, color: C.white, align: 'center', margin: 0, isTextBox: true })
    s.addText('github.com/madhavansuresh000-sys/eventhub', { x: 7.6, y: 4.3, w: 5, h: 0.4, fontFace: BODY, fontSize: 15, color: C.mid, align: 'center', margin: 0, isTextBox: true })
    s.addText('Madhavan Suresh  ·  Java Full Stack', { x: 7.6, y: 4.75, w: 5, h: 0.4, fontFace: BODY, fontSize: 14, color: C.mid, align: 'center', margin: 0, isTextBox: true })
    footer(s, true)
    s.addNotes('To conclude: EventHub is a complete product, it stays correct when many people use it at once, and it follows professional practice with security, tests and CI. Thank you. I am happy to take questions, and the code is on my GitHub.')
  }

  await pres.writeFile({ fileName: OUT })
  console.log('written', OUT, n, 'slides')
}

main().catch((e) => { console.error(e); process.exit(1) })
