"""Writes the diagram HTML pages and renders each to PNG with headless Edge."""
import os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
os.makedirs(SRC, exist_ok=True)
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

CSS = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Calibri,Arial,sans-serif;background:#fff;color:#1f2937;padding:28px;width:1400px}
.row{display:flex;align-items:center;gap:18px}
.col{display:flex;flex-direction:column;gap:14px}
.b{border:2px solid #4f46e5;background:#eef2ff;border-radius:12px;padding:14px 18px;text-align:center}
.b b{display:block;font-size:22px;color:#1e1b4b}
.b span{font-size:16px;color:#374151}
.dark{background:#1e1b4b;border-color:#1e1b4b}.dark b,.dark span{color:#fff}
.amber{background:#fef3c7;border-color:#f59e0b}
.green{background:#dcfce7;border-color:#15803d}
.red{background:#fee2e2;border-color:#b91c1c}
.gray{background:#f3f4f6;border-color:#9ca3af}
.arrow{font-size:34px;color:#6b7280;line-height:1}
.lbl{font-size:16px;color:#4b5563;text-align:center}
.frame{border:3px dashed #1e1b4b;border-radius:16px;padding:18px}
.frame>h3{font-size:20px;color:#1e1b4b;text-align:center;margin-bottom:12px}
h2{font-size:26px;color:#1e1b4b;margin-bottom:18px}
"""

PAGES = {
'architecture': (1000, """<h2>EventHub architecture</h2>
<div class="row" style="align-items:stretch">
 <div class="col" style="width:280px;justify-content:center">
  <div class="b"><b>Browser</b><span>React 19 single-page app<br>Redux store · React Router<br>Axios (api/client.js)</span></div>
  <div class="lbl">JSON over HTTP<br>JWT in httpOnly cookie<br>X-XSRF-TOKEN header</div>
  <div class="b amber"><b>Vite dev server :5173</b><span>forwards /api to :8080</span></div>
 </div>
 <div class="arrow" style="align-self:center">&#10140;</div>
 <div class="frame" style="width:520px"><h3>Spring Boot API :8080</h3>
  <div class="col">
   <div class="b amber"><b>Security filter chain</b><span>JwtCookieFilter · CSRF · CORS · URL rules</span></div><div class="arrow" style="text-align:center">&#8595;</div>
   <div class="b"><b>Controllers</b><span>@RestController · @Valid · @PreAuthorize</span></div><div class="arrow" style="text-align:center">&#8595;</div>
   <div class="b"><b>Services</b><span>business rules · @Transactional · events · @Cacheable</span></div><div class="arrow" style="text-align:center">&#8595;</div>
   <div class="b"><b>Repositories</b><span>Spring Data JPA · Hibernate · JPQL</span></div>
   <div class="b gray"><b>Scheduled jobs</b><span>hold expiry · waitlist offers · email retry · reminders</span></div>
  </div></div>
 <div class="arrow" style="align-self:center">&#10140;</div>
 <div class="col" style="width:420px;justify-content:center">
  <div class="b dark"><b>MySQL 8.4 (Docker)</b><span>17 tables · Flyway V1-V9</span></div>
  <div class="b"><b>Mail server</b><span>Mailpit :1025 / :8025 in development</span></div>
  <div class="b"><b>Stripe</b><span>Checkout + signed webhook (test mode)</span></div>
  <div class="b amber"><b>GitHub Actions CI</b><span>backend tests (Testcontainers) + frontend lint / test / build</span></div>
 </div></div>"""),
'request-flow': (900, """<h2>The journey of one request: Ravi presses "Book now"</h2>
<div class="col" style="gap:10px">
<div class="row"><div class="b" style="width:340px"><b>1. React page</b><span>api.post('/bookings', {eventId, quantity})</span></div><div class="arrow">&#10140;</div><div class="lbl" style="width:900px;text-align:left">Axios sends the login cookie (JWT) automatically and copies the XSRF-TOKEN cookie into the X-XSRF-TOKEN header.</div></div>
<div class="row"><div class="b amber" style="width:340px"><b>2. Security filters</b><span>JwtCookieFilter + CSRF check</span></div><div class="arrow">&#10140;</div><div class="lbl" style="width:900px;text-align:left">JWT signature and expiry checked: the user is "logged in" for this one request. Wrong CSRF token: 403. No login: 401.</div></div>
<div class="row"><div class="b" style="width:340px"><b>3. BookingController</b><span>@Valid BookingRequest</span></div><div class="arrow">&#10140;</div><div class="lbl" style="width:900px;text-align:left">JSON becomes a Java record; quantity must be 1-10, otherwise 400 with a clear message per field (GlobalExceptionHandler).</div></div>
<div class="row"><div class="b" style="width:340px"><b>4. BookingService.hold</b><span>Retry.onConflict + TransactionTemplate</span></div><div class="arrow">&#10140;</div><div class="lbl" style="width:900px;text-align:left">Rules: event published and in the future, enough seats, no second active booking. Seats are taken from events.available_seats (version checked).</div></div>
<div class="row"><div class="b" style="width:340px"><b>5. Repositories</b><span>EventRepository · BookingRepository</span></div><div class="arrow">&#10140;</div><div class="lbl" style="width:900px;text-align:left">UPDATE events SET available_seats = 9, version = 8 WHERE id = 2 AND version = 7, then INSERT INTO bookings (status HELD, hold 10 minutes).</div></div>
<div class="row"><div class="b dark" style="width:340px"><b>6. MySQL</b><span>commit</span></div><div class="arrow">&#10140;</div><div class="lbl" style="width:900px;text-align:left">Both changes are saved together or not at all (one transaction). If another student changed the event first, the version does not match: retry with fresh data.</div></div>
<div class="row"><div class="b green" style="width:340px"><b>7. Response 201 Created</b><span>BookingResponse JSON</span></div><div class="arrow">&#10140;</div><div class="lbl" style="width:900px;text-align:left">The React app opens /checkout/{id} and shows the 10-minute timer from secondsLeft, which the server calculated.</div></div>
</div>"""),
'states': (820, """<h2>Booking states (bookings.status)</h2>
<div class="row" style="gap:22px">
 <div class="b amber" style="width:240px"><b>HELD</b><span>seats taken,<br>10-minute timer</span></div>
 <div class="col" style="gap:6px;width:170px"><div class="lbl">paid, or a free event</div><div class="arrow" style="text-align:center">&#10140;</div></div>
 <div class="b green" style="width:260px"><b>CONFIRMED</b><span>QR ticket valid<br>checked_in_at set at the gate</span></div>
 <div class="col" style="gap:6px;width:170px"><div class="lbl">student cancels before the event</div><div class="arrow" style="text-align:center">&#10140;</div></div>
 <div class="b red" style="width:240px"><b>CANCELLED</b><span>seats back,<br>refund if paid</span></div>
</div>
<div class="row" style="margin:12px 0 0 70px"><div class="arrow">&#8595;</div><div class="lbl" style="text-align:left">not paid within 10 minutes (job every minute), or the student releases the seats</div></div>
<div class="row" style="margin-top:8px"><div class="b gray" style="width:240px"><b>EXPIRED</b><span>seats back on sale</span></div>
<div class="lbl" style="width:1000px;text-align:left;margin-left:10px">Freed seats (cancel or expiry) are first offered to the waitlist: WAITING, then OFFERED for 30 minutes, then BOOKED - or EXPIRED, and the next student gets the offer. A payment that arrives after EXPIRED takes the seats again if they are still free, otherwise it is refunded.</div></div>
<h2 style="margin-top:34px">Event states (events.status)</h2>
<div class="row"><div class="b" style="width:260px"><b>DRAFT</b><span>organizer edits</span></div><div class="col" style="gap:4px;width:160px"><div class="lbl">submit (future only)</div><div class="arrow" style="text-align:center">&#10140;</div></div>
<div class="b amber" style="width:300px"><b>PENDING_APPROVAL</b><span>locked for editing</span></div><div class="col" style="gap:4px;width:160px"><div class="lbl">admin approves</div><div class="arrow" style="text-align:center">&#10140;</div></div>
<div class="b dark" style="width:260px"><b>PUBLISHED</b><span>visible and bookable</span></div></div>
<div class="lbl" style="text-align:left;margin-top:12px">The admin can also reject with a reason: the event goes back to DRAFT and the organizer sees the note (review_note).</div>"""),
'er-diagram': (820, """<h2>Main tables and how they are linked</h2>
<div class="row" style="align-items:flex-start;gap:22px">
 <div class="col" style="width:310px">
  <div class="b"><b>users</b><span>email, password_hash, full_name, enabled</span></div>
  <div class="b gray"><b>user_roles + roles</b><span>STUDENT, ADMIN</span></div>
  <div class="b gray"><b>profiles</b><span>department, year (one per user)</span></div>
  <div class="b"><b>club_members</b><span>user + club + club_role<br>ORGANIZER / VOLUNTEER / MEMBER</span></div>
  <div class="b"><b>clubs</b><span>name, slug</span></div>
 </div>
 <div class="col" style="width:330px">
  <div class="b dark"><b>events</b><span>club_id, title, start / end, total_seats,<br>available_seats, price, status, version</span></div>
  <div class="b gray"><b>event_tags + tags</b><span>many-to-many</span></div>
  <div class="b gray"><b>audit_log</b><span>who did what to which event</span></div>
  <div class="b amber"><b>waitlist_entries</b><span>user, event, quantity, status,<br>offer_expires_at</span></div>
 </div>
 <div class="col" style="width:330px">
  <div class="b dark"><b>bookings</b><span>user, event, quantity, status, amount,<br>ticket_code, hold_expires_at,<br>checked_in_at / by, version</span></div>
  <div class="b"><b>payments</b><span>booking, provider, session_id, status</span></div>
  <div class="b gray"><b>processed_payment_events</b><span>webhook ids already handled</span></div>
 </div>
 <div class="col" style="width:300px">
  <div class="b green"><b>certificates</b><span>booking (unique), number EH-YYYY-...</span></div>
  <div class="b green"><b>feedback</b><span>booking (unique), rating 1-5, comment</span></div>
  <div class="b"><b>notifications</b><span>user, kind, text, read, email status</span></div>
 </div>
</div>
<div class="lbl" style="text-align:left;margin-top:18px;font-size:18px">Read it like this: a <b>club</b> has many <b>events</b>; a <b>user</b> has many <b>bookings</b>; each booking belongs to one event, may have <b>payments</b> and - after the gate scan and the end of the event - one <b>certificate</b> and one <b>feedback</b>.</div>"""),
'test-pyramid': (560, """<h2>The testing pyramid used in EventHub</h2>
<div class="col" style="align-items:center;gap:8px">
<div class="b amber" style="width:440px"><b>Manual + scripted demo</b><span>28-step Edge tour · Postman collection (43 checks)</span></div>
<div class="b" style="width:720px"><b>Integration tests (most of the 133 backend tests)</b><span>@SpringBootTest + MockMvc + real MySQL 8.4 from Testcontainers · security, flows, concurrency</span></div>
<div class="b dark" style="width:980px"><b>Unit tests</b><span>JUnit 5 + Mockito (Stripe gateway, Retry, analytics maths, jobs) · Vitest + React Testing Library (13 tests)</span></div>
<div class="b gray" style="width:1240px"><b>Every push: GitHub Actions CI</b><span>mvnw verify (tests + JaCoCo coverage) · npm run lint · npm test · npm run build</span></div>
</div>"""),
}

for name, (height, body) in PAGES.items():
    html = os.path.join(SRC, name + '.html')
    with open(html, 'w', encoding='utf-8') as f:
        f.write('<!doctype html><meta charset="utf-8"><style>' + CSS + '</style><body>' + body + '</body>')
    png = os.path.join(HERE, name + '.png')
    subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--hide-scrollbars', f'--screenshot={png}',
                    f'--window-size=1456,{height}', '--default-background-color=ffffffff', 'file:///' + html.replace('\\', '/')],
                   check=True, capture_output=True, timeout=90)
    print(name, os.path.getsize(png))
