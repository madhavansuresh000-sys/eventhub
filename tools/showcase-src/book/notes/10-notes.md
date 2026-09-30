# 1. How to use these notes

These notes help you **explain EventHub to anyone** - a friend, a teacher, an interviewer or a non-technical person - in simple words. Read the scripts aloud a few times; then say them in your own words. Do not memorise every sentence; remember the **story** and the **numbers**.

| If you have... | Use |
|---|---|
| 1 minute | Section 2.1 (elevator pitch) |
| 5 minutes | Section 2.2 |
| A non-technical listener | Section 2.3 |
| A teacher / examiner | Section 2.4, then chapter 6 (viva) |
| An interviewer | Section 2.5 and chapter 4 (hard problems) |

# 2. Explanation scripts

## 2.1 The 1-minute explanation (elevator pitch)

"My project is **EventHub**, a website that runs college events from start to finish. Students find an event, book a seat, pay, and get a **QR ticket**. At the entrance a volunteer scans it - it works **only once**. After the event, students who really came get a **PDF certificate** that anyone can verify online, and they can rate the event. Clubs create events, and the college admin approves them.

I built it with **React** for the screens, **Spring Boot (Java)** for the server and **MySQL** for the data. The special part is that it stays correct when many people act at once: I proved with a test of **100 students clicking at the same second** that it never sells more seats than exist. It has **146 automated tests**, and GitHub runs them on every change."

## 2.2 The 5-minute explanation

1. **The problem (30 s).** Colleges use WhatsApp and Google Forms for events. That leads to overbooking, shared ticket screenshots, late or fake certificates, and no numbers for organizers.
2. **The users (30 s).** Visitors browse; students book; organizers create events for their club; volunteers scan tickets; the admin approves events.
3. **The journey (1 min).** Ravi searches "hackathon", sees "110 of 120 booked", books one seat. The seat is **held for 10 minutes** while he pays. After payment he gets a QR ticket and an email. At the gate Priya scans it: green **LET IN**. If someone tries the same QR again: red **ALREADY USED at 8:41 pm by Priya**. After the event Ravi downloads a certificate with a random number like EH-2026-BEQR4Y79.
4. **How it is built (1 min).** React app → Spring Boot REST API → MySQL. Inside the server: security filters, controllers, services with the rules, repositories for the database. Flyway keeps every database identical.
5. **The clever parts (1 min).**
   - No overselling: a **version number** on each event (optimistic locking) plus automatic retry.
   - One entry per ticket: **one SQL UPDATE** that only marks a ticket if it is not used yet.
   - Emails only **after** the database change is saved, so nobody gets an email about something that was undone.
   - Payments: seats held, Stripe (or a test page), a **signed** webhook that is processed only once, and automatic refunds for late payments.
6. **Security (30 s).** BCrypt passwords, login token in an **httpOnly cookie**, CSRF protection, roles checked on every request, lock after 5 wrong passwords.
7. **Quality (30 s).** 146 tests (Mockito, Testcontainers with real MySQL, React Testing Library), 91% coverage, CI on every push.

## 2.3 For a non-technical person

"You know how college events are announced on WhatsApp and people fill a Google Form? Sometimes more people fill it than there are seats, people share screenshots to get in, and certificates come weeks later.

EventHub is like **BookMyShow for college events**. You see all events in one place, you book your seat, and the website keeps your seat for 10 minutes while you pay - nobody else can take it. You get a QR code, like a movie ticket. At the door, a volunteer scans it with a phone: green means come in. If your friend tries the same QR code, it shows red, because each ticket works only once. After the event, you download a certificate, and any company can check on the website that it is real. The club that organised the event sees how many came and what people thought."

## 2.4 For a teacher or examiner

Stress the **engineering**: requirements, architecture, database design, testing.

- "It is a three-tier application: React SPA, Spring Boot REST API with layered architecture, MySQL with 17 tables managed by Flyway migrations."
- "Business rules are enforced on the server, inside transactions: for example the event status is a state machine - DRAFT, PENDING_APPROVAL, PUBLISHED - and illegal moves are refused."
- "Concurrency is handled with optimistic locking and verified with a 100-thread test; the gate uses a conditional UPDATE, verified with 20 parallel gates."
- "Security uses BCrypt, JWT in httpOnly cookies, CSRF tokens and method-level authorization with @PreAuthorize."
- "Quality: 133 backend tests with Testcontainers, 13 React tests, JaCoCo coverage 91% on services, GitHub Actions CI."
- "I documented it in a 105-page guide and a 21-slide presentation."

## 2.5 For an interviewer

Use the **STAR** pattern (Situation, Task, Action, Result) with one hard problem:

- **Situation:** "In my event platform, many students could try to book the last seats at the same moment."
- **Task:** "Guarantee we never sell more seats than exist, without making everyone wait."
- **Action:** "I used optimistic locking with a version column and a retry in a new transaction. I also found a MySQL deadlock and fixed it by always updating the event row before inserting the booking. I wrote a test where 100 threads book 10 seats at once, repeated three times."
- **Result:** "Exactly 10 bookings every time; without the version column the same test sold 96-99 seats. It runs in CI on every push."

Then offer a second story: the gate double-scan (conditional UPDATE + REPEATABLE READ snapshot), or the scanner crash your automated demo tour found.

# 3. Key concepts in one line each

| Concept | One-line explanation | Where in EventHub |
|---|---|---|
| Full stack | Both the screens and the server, plus the database | React + Spring Boot + MySQL |
| REST API | URLs + HTTP methods that return JSON | 50 endpoints under /api |
| Component | A reusable piece of screen | EventCard, ResultPanel |
| Redux | One shared store of app data | auth, cart, organizer, admin slices |
| Spring Boot | Java framework that wires everything up | EventhubApplication |
| Dependency injection | Spring gives each class what it needs | constructor + @RequiredArgsConstructor |
| JPA entity | A Java class for a table | Event, Booking |
| Repository | Interface to read/write a table | BookingRepository |
| Transaction | All changes succeed or none | @Transactional, TransactionTemplate |
| Flyway | Numbered SQL files that build the database | V1 … V9 |
| Optimistic locking | Save only if nobody changed it since you read it | @Version on Event and Booking |
| Conditional UPDATE | Check and change in one step | markCheckedIn |
| Idempotency | Doing it twice = doing it once | processed_payment_events |
| Outbox / after commit | Send emails only after the change is saved | EmailSender.afterCommit |
| JWT | Signed token saying who you are | EVENTHUB_TOKEN cookie, 8 hours |
| httpOnly cookie | Cookie JavaScript cannot read | the login cookie |
| CSRF | Attack from another website; blocked by a secret header | X-XSRF-TOKEN |
| BCrypt | Slow, salted password hashing | PasswordConfig |
| @PreAuthorize | Permission check on a method | @clubAccess.isOrganizer(#clubId) |
| Scheduled job | Code that runs on a timer | HoldExpiryJob, reminders at 18:00 |
| Cache | Short-term memory of an answer | analytics, 60 seconds |
| Mock | Fake object for a test | Mockito in StripePaymentGatewayTest |
| Testcontainers | Real database in Docker for tests | MySqlTestDatabase |
| CI | Tests on every push | GitHub Actions |
| Code splitting | Load pages only when needed | React.lazy, 1213 → 329 kB |

# 4. Hard problems and how I solved them

| Problem | Simple explanation | Solution |
|---|---|---|
| Last-seat race | Two people read "1 left" and both book | @Version + retry; 100-thread test |
| Deadlock | Two transactions wait for each other forever | Always update the event first |
| Double scan | Two gates let the same ticket in | One conditional UPDATE; 20-gate test |
| Stale snapshot | MySQL showed the old "unused" value | Decide from the UPDATE result |
| Email for undone work | Email sent, then the change rolled back | Send after commit, retry on failure |
| Same webhook twice | Stripe resends a message | Unique message id table |
| Late payment | Money arrives after the hold expired | Take seats again or refund |
| Flaky JWT test | Failed 1 in 16 runs | Last base64 letter has 2 unused bits; change the first letter |
| Blank scanner page | Crash after a refactor | Found by demo tour; fix + page test + lint rule |

# 5. Numbers to remember

| Number | Meaning |
|---|---|
| 10 | phases (0-9) |
| 29 | pages / routes |
| 50 | REST endpoints |
| 17 | database tables, 9 migrations |
| 146 | automated tests (133 backend + 13 frontend) |
| 91% | service test coverage (92% whole backend) |
| 100 / 10 | threads / seats in the concurrency test - exactly 10 bookings |
| 20 | gates scanning the same ticket - exactly 1 VALID |
| 10 min | seat hold while paying |
| 30 min | waitlist offer time |
| 5 / 15 min | wrong passwords / lock time |
| 8 h | login (JWT) lifetime |
| 60 s | analytics cache |
| 1213 → 329 kB | first download after code splitting |
| 28 | steps in the automated Edge demo tour |
| 60+ | Git commits |
