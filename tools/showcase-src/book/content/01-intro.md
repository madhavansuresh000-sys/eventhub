# 1. Introduction

## 1.1 What is EventHub?

EventHub is a website where a college runs all of its events in one place. A student can find an event, book a seat, pay, receive a QR ticket, enter through the gate by showing that QR code, download a certificate after the event and rate the event. Clubs create the events, the Student Affairs Office (the admin) approves them, and volunteers check tickets at the gate.

It is a **full stack** application: the part you see in the browser (the **frontend**) is written in React, the part that stores data and applies the rules (the **backend**) is written in Java with Spring Boot, and the data lives in a MySQL database.

>> Think of a cinema. The cinema website shows the films (frontend). Behind it, a ticket system makes sure two people never get the same seat and records every payment (backend). The list of seats and bookings is kept in a big register (database). At the door, a staff member scans your ticket once (gate check-in). EventHub is the same idea for college events.

![The EventHub home page - students search events or pick a tag](01-home.png)

## 1.2 Why this project? (the problem)

In many colleges, events are organised with WhatsApp groups, Google Forms and printed lists. This causes real problems:

- **Overbooking.** Two students fill the form for the last seat at the same time. Both believe they are in.
- **Fake or shared tickets.** A screenshot of a confirmation message is forwarded. At the door nobody can tell whether it was already used.
- **Slow, fake-able certificates.** Certificates are made by hand, weeks later, and a nicely edited PDF can be put on a resume even by someone who never attended.
- **No numbers for organizers.** Clubs do not know how many tickets they sold per day, how many people actually came, or what people thought of the event.
- **No control.** Anybody can announce an event; there is no approval step and no record of who changed what.

EventHub solves each of these problems with a clear rule in the software, and the rest of this document shows exactly how.

## 1.3 Objectives

| # | Objective | How EventHub meets it |
|---|---|---|
| 1 | Easy discovery | Search by text, filter by tag, club and date; results are filtered and paged by the server |
| 2 | Fair booking | Seats are held for 10 minutes while paying; optimistic locking guarantees no overselling |
| 3 | Smart waitlist | When a seat frees up, it is kept 30 minutes for the next student on the waitlist |
| 4 | Fast, safe entry | Each ticket has a random code shown as a QR code; the gate accepts it only once |
| 5 | Proof of attendance | PDF certificates only for students who were scanned at the gate, verifiable by anyone |
| 6 | Control | Events need admin approval; every change is written to an audit log |
| 7 | Insight | Feedback stars, check-in rate and sales charts for organizers and the admin |
| 8 | Quality | 146 automated tests, 91% service coverage, every push tested by GitHub Actions |

## 1.4 Scope

**Inside the scope** of this project:

- Public catalogue of events, clubs and tags
- Registration and login with roles (student, organizer, volunteer, admin)
- Event creation, editing and the approval workflow
- Booking with seat holds, payment (Stripe test mode or a built-in test page), cancellation and refunds
- Waitlist with automatic offers, notifications (bell + email) and day-before reminders
- QR tickets and a gate scanner with a live counter
- PDF certificates and a public verification page
- Feedback and analytics dashboards
- Automated tests, continuous integration and full documentation

**Outside the scope** (see the Future Scope chapter): password reset by email, a mobile app, several colleges on one installation, and a real "volunteers" management page (volunteers exist and can scan; only the management screen uses sample names).

## 1.5 Who should read this document

| Reader | Start with |
|---|---|
| A teacher or examiner | Chapters 1, 2, 4, 11 and 17 (viva questions) |
| A developer who wants to run it | Chapter 5 (setup), then chapter 13 (troubleshooting) |
| A developer who wants to change the code | Chapters 4, 6, 7, 8 and 9 |
| A user of the website | Chapter 10 (user guide with screenshots) |
| An interviewer | Chapters 12 (security), 14 (lessons) and 17 |

## 1.6 How this document is written

- **Simple English.** Every technical word is explained the first time it appears, and the Glossary (chapter 16) repeats the definitions.
- **Real examples.** The examples use the real demo data: the student **Ravi Kumar**, the organizer **Madhavan** (Coding Club), the volunteer **Priya Raman**, the organizer **Kavya** (Cultural Club) and the **admin** of the Student Affairs Office.
- **Real code.** Every code excerpt is copied automatically from the project files when this document is built, so the code you read here is exactly the code on GitHub.
- **Real screenshots.** All screenshots were taken by a script (`tools/edge-tour.mjs`) that drives the real application in Microsoft Edge.

> Boxes like this one contain notes: extra detail, a warning or a tip.

>> Boxes like this one compare a technical idea with something from everyday life.

## 1.7 The demo accounts

In development the backend creates five demo accounts automatically (class `DevDataSeeder`). They all use the password stored in `DEMO_PASSWORD` in the `.env` file.

| Email | Who | What they can do |
|---|---|---|
| `admin@eventhub.test` | Admin (Student Affairs Office) | Approve / send back events, see all analytics and the activity log |
| `madhavan@eventhub.test` | Organizer of the Coding Club | Create and submit Coding Club events, see its analytics and feedback, scan tickets |
| `kavya@eventhub.test` | Organizer of the Cultural Club | The same, but only for the Cultural Club |
| `priya@eventhub.test` | Volunteer of the Coding Club | Scan tickets at the gate for Coding Club events |
| `ravi@eventhub.test` | Student | Book, pay, tickets, waitlist, certificates, feedback |

# 2. Requirements

Requirements describe **what** the system must do (functional) and **how well** it must do it (non-functional). They were written before the code, phase by phase, in the checklists of the `Phase_*` folders.

## 2.1 Functional requirements by role

### Visitor (not logged in)

| ID | Requirement |
|---|---|
| V1 | See upcoming published events on the home page, with search and tag chips |
| V2 | Search, filter (tag, club, from/to date) and sort (date, price, title) all events, with paging |
| V3 | Open an event: description, venue, time, price and a live "seats left" bar |
| V4 | Open a club page with its events |
| V5 | Register a student account; log in |
| V6 | Verify a certificate number without logging in |

### Student

| ID | Requirement |
|---|---|
| S1 | Book 1-10 tickets for a published future event; seats are held for 10 minutes |
| S2 | Pay (Stripe Checkout, or the built-in test page when no Stripe key is set); free events are confirmed at once |
| S3 | See "My tickets" (upcoming, past, cancelled) and open a QR ticket; print it |
| S4 | Cancel a confirmed ticket before the event (seats go back, payment refunded) |
| S5 | Join the waitlist of a sold-out event and see the position ("You are #2"); accept an offer within 30 minutes |
| S6 | Receive notifications (bell) and emails: booking confirmed, seat offered, reminder the day before |
| S7 | Download a PDF certificate for events attended (scanned at the gate) that are over |
| S8 | Rate an attended event 1-5 stars with an optional comment; change the rating later |

### Organizer (per club)

| ID | Requirement |
|---|---|
| O1 | Create and edit events of their own club (title, description, venue, times, seats, price, tags) |
| O2 | Submit a draft for approval; see the admin's note when an event is sent back |
| O3 | Dashboard: published events, tickets sold, money collected, waiting approvals |
| O4 | Analytics for the last 7 / 30 / 90 days: tickets and money per day, check-in rate, ratings |
| O5 | Read the feedback of their events (anonymous) |
| O6 | Use the gate scanner for their club's events |

### Volunteer (per club)

| ID | Requirement |
|---|---|
| G1 | Choose an event of their club and scan QR tickets (camera or typed code) |
| G2 | See VALID (let in), ALREADY USED (when, by whom) or INVALID, in big colours |
| G3 | See a live counter "checked in / booked" shared by all gates |

### Admin

| ID | Requirement |
|---|---|
| A1 | Approval queue (soonest first): approve, or send back with a reason |
| A2 | Overview per club: published, waiting, tickets sold, money |
| A3 | Activity (audit) log: who created, edited, submitted, approved or rejected each event |
| A4 | Analytics for all clubs or one club |
| A5 | Open the API documentation (Swagger) and technical pages (Actuator) |

## 2.2 Business rules (the most important ones)

Business rules are the "laws" of the system. The server checks every one of them, even if the page already did.

| Rule | Where it is checked |
|---|---|
| End time must be after start time | `EventService.checkTimes` |
| Seats cannot be reduced below the number already booked | `EventService.update` |
| An event waiting for approval cannot be edited | `EventService.update` |
| Only future events can be submitted | `EventService.submit` |
| Status moves only DRAFT → PENDING_APPROVAL → PUBLISHED (or back to DRAFT) | `EventStatus.canMoveTo` |
| Never sell more seats than exist | `@Version` on `Event` + `Retry.onConflict` |
| One active booking per student per event | `BookingService.holdOnce` |
| A ticket can be used at the gate only once | conditional `UPDATE` in `BookingRepository.markCheckedIn` |
| A used ticket cannot be cancelled | `BookingService.cancel` |
| Certificate only if checked in AND the event has ended | `BookingRepository.findIdsEarningCertificate` |
| Rating only by attendees, after the event, 1-5 stars | `FeedbackService.give` + database CHECK |
| 5 wrong passwords (same email + address) → locked 15 minutes | `LoginAttemptService` |

## 2.3 Non-functional requirements

| Quality | Requirement | How it is met |
|---|---|---|
| Correctness under load | 100 students clicking "book" at the same second never oversell | optimistic locking + retry; concurrency test with 100 threads |
| Security | Passwords never stored in plain text; tokens not readable by scripts; roles checked on the server | BCrypt, httpOnly JWT cookie, CSRF, `@PreAuthorize` |
| Performance | Search and lists are paged; dashboards do not hammer the database | server-side paging, `@EntityGraph`, `@BatchSize`, 60-second cache |
| Usability | Works on a phone (375 px wide), light and dark mode, readable contrast | Tailwind responsive layout; automated contrast and tap-size checks |
| Accessibility | Labels on every input, screen-reader announcements for results, table view for charts | `aria-*` attributes, `role="alert"`, "Show the numbers as a table" |
| Maintainability | Clear modules, one migration per database change, readable code with comments | package per feature, Flyway, code comments in simple English |
| Testability | Automatic tests for every rule; CI on every push | 146 tests, Testcontainers, GitHub Actions |
| Portability | Runs on any laptop with Docker, Java and Node | `docker-compose.yml`, Maven wrapper, `package.json` |

## 2.4 User stories with examples

A user story says who wants what and why. Each one below has an example with the demo data.

1. *As a student, I want to see how many seats are left, so that I know if I must hurry.* Example: Ravi opens "24-Hour Hackathon" and sees "110 booked / 120 · 92% full".
2. *As a student, I want my seats kept while I pay, so that nobody takes them in the meantime.* Example: Ravi presses "Book now"; the checkout shows a 10:00 timer; the two seats are his for ten minutes.
3. *As a student on a waitlist, I want to be told when a seat frees up.* Example: Asha cancels; Ravi (#1 on the waitlist) gets an email "A seat is waiting for you" and a bell notification, with 30 minutes to accept.
4. *As a volunteer, I want a clear answer at the gate, so that the queue moves fast.* Example: Priya scans Ravi's QR: a big green "LET IN - Ravi Kumar". Someone tries the same QR again: red "ALREADY USED at 8:41 pm by Priya Raman".
5. *As a company recruiter, I want to check a certificate, so that I know it is real.* Example: the recruiter types EH-2026-BEQR4Y79 on /verify and sees "Genuine EventHub certificate - Ravi Kumar - Linux Basics (demo)".
6. *As an organizer, I want to know if people liked my event.* Example: Madhavan opens the feedback page of Linux Basics: average 4.0 stars and the comment "Clear explanations of the terminal", without the student's name.
7. *As the admin, I want to review events before they are public.* Example: the admin opens the approval queue, reads "Drone Building Workshop", and sends it back with "Please add the venue capacity".

# 3. Technologies used

This chapter explains every important tool in simple words: what it is, why EventHub uses it, and a small example from the project.

## 3.1 The big picture

| Layer | Technology | Version |
|---|---|---|
| Frontend language | JavaScript (JSX) | ES2024 |
| Frontend library | React | 19 |
| Build tool / dev server | Vite | 8 |
| Styling | Tailwind CSS | 4 |
| Shared state | Redux Toolkit + React Redux | 2 / 9 |
| Routing | React Router | 7 |
| HTTP client | Axios | 1 |
| Charts / QR camera | Recharts / html5-qrcode | 3 / 2 |
| Backend language | Java | 25 |
| Backend framework | Spring Boot (Web MVC, Data JPA, Security, Validation, Mail, Cache, Actuator) | 4.1 |
| Database | MySQL | 8.4 |
| Database migrations | Flyway | via Spring Boot |
| Tokens | Nimbus JOSE (JWT, HS256) via spring-security-oauth2-jose | via Spring Boot |
| QR images / PDFs | ZXing / OpenPDF | 3.5 / 2.2 |
| Payments | Stripe Java SDK | 29 |
| Cache | Caffeine | via Spring Boot |
| API documentation | springdoc-openapi (Swagger UI) | 3.1 |
| Tests (backend) | JUnit 5, Mockito, AssertJ, MockMvc, Testcontainers, JaCoCo | |
| Tests (frontend) | Vitest, React Testing Library, jsdom | 5 / 16 |
| Containers | Docker Desktop, Docker Compose | |
| CI | GitHub Actions | |

## 3.2 Frontend technologies

### React

React builds a page out of small, reusable **components**. A component is a JavaScript function that returns what should appear on the screen (written in JSX, which looks like HTML). When data changes, React redraws only the parts that changed.

>> A component is like a LEGO brick. `EventCard` is one brick; the events page puts twelve of them in a grid; the home page reuses the same brick in the "Upcoming events" row.

Example from EventHub: the gate scanner shows its answer with the small component `ResultPanel`:

@code frontend/src/components/scanner/ResultPanel.jsx :: export default function ResultPanel

### Vite

Vite is the development server and build tool. `npm run dev` starts a server on port 5173 that reloads the page the moment a file is saved. `npm run build` produces small, optimised files for production. Vite also **forwards** every call that starts with `/api` to Spring Boot on port 8080, so the browser only ever talks to one address:

@lines frontend/vite.config.js :: 5 :: 20

### Tailwind CSS

Tailwind is a way of styling with small ready-made class names written directly on the elements, such as `rounded-2xl p-6 text-white bg-green-700`. The EventHub colours (the indigo "brand" colours) are defined once as design tokens in `index.css`. Dark mode works by adding a `dark` class on the `<html>` element; classes such as `dark:bg-slate-900` then apply.

### Redux Toolkit

Some data is needed by many pages at once: who is logged in, the seats being held in the cart, the organizer's events. Redux keeps this data in one **store**. Each area has a **slice** (auth, cart, notifications, student, organizer, admin) with its own actions. Pages read with `useSelector` and change things with `useDispatch`.

>> The Redux store is like the notice board in a college office: everybody reads the same board, and only the office staff (the reducers) may change what is pinned on it.

### React Router

React Router shows the right page for the address in the browser, without reloading the whole page. EventHub has 29 routes, for example `/events/:id`, `/checkout/:bookingId`, `/organizer/analytics` and `/verify/:number`. Protected routes are wrapped in `RequireAuth`, which sends visitors to the login page and remembers where they wanted to go (`?next=`).

### Axios

Axios sends HTTP requests to the backend. EventHub creates one configured instance (`api/client.js`) with the base address `/api`. It automatically sends cookies and copies the CSRF token into the `X-XSRF-TOKEN` header.

### Recharts and html5-qrcode

Recharts draws the bar charts of the analytics dashboard. html5-qrcode reads QR codes from the laptop or phone camera on the scanner page. Both are loaded only when those pages are opened (code splitting, see chapter 9).

## 3.3 Backend technologies

### Java 25 and Spring Boot 4

Java is the programming language of the backend. Spring Boot is a framework: it gives ready-made building blocks (a web server, database access, security, email, scheduling) and connects them automatically, so the project only writes the business logic.

Important ideas of Spring used everywhere in EventHub:

- **Bean**: an object created and managed by Spring (for example `BookingService`).
- **Dependency injection**: a class says which beans it needs in its constructor, and Spring passes them in. With Lombok's `@RequiredArgsConstructor` this is one line.
- **Annotations**: labels such as `@RestController`, `@Service`, `@Transactional`, `@Scheduled` that tell Spring what to do with a class or method.

>> Dependency injection is like a hotel room: you do not bring your own bed and lamp; you ask for "a room" and everything you need is already there.

### Spring Web MVC

Turns Java methods into web addresses. A method with `@GetMapping("/api/events/{id}")` answers `GET /api/events/5`. Java objects are converted to JSON automatically (Jackson 3).

### Spring Data JPA and Hibernate

JPA maps Java classes (**entities**) to database tables. Hibernate is the library that writes the SQL. Spring Data creates **repositories**: an interface such as `BookingRepository extends JpaRepository<Booking, Long>` already has `save`, `findById`, `findAll`; methods named like `findByUserIdOrderByCreatedAtDesc` are turned into queries automatically; complex ones are written in JPQL with `@Query`.

### Flyway

Flyway runs the SQL files in `db/migration` in order (V1, V2, … V9) and remembers which ones already ran (table `flyway_schema_history`). So every laptop, test database and server always has exactly the same tables. Hibernate is set to `ddl-auto: validate`: it only checks that the entities match the tables and refuses to start if they do not.

### Spring Security

Every request passes through a chain of filters before it reaches a controller. EventHub adds its own `JwtCookieFilter` (reads the login cookie) and configures CSRF protection, CORS and URL rules in `SecurityConfig`. Method-level rules use `@PreAuthorize`, for example `@PreAuthorize("@clubAccess.isOrganizer(#clubId)")`.

### Other backend libraries

| Library | Used for | Example in EventHub |
|---|---|---|
| Bean Validation | Checking request fields | `@NotBlank`, `@Size(max = 200)`, `@Min(1)` in `EventRequest` |
| Spring Mail | Sending emails | `EmailSender` sends "Seat offered" through Mailpit |
| Spring Scheduling | Jobs on a timer | `HoldExpiryJob` every 60 s; reminders at 18:00 |
| Spring Cache + Caffeine | Remembering answers | analytics kept 60 s with `@Cacheable` |
| ZXing | Drawing QR codes | `GET /api/bookings/{id}/qr.png` |
| OpenPDF | Drawing PDFs | certificate PDF with name, event and QR |
| Stripe Java | Payments | Checkout session, webhook signature, refunds |
| Lombok | Less boilerplate | `@Getter @Setter` on entities |
| springdoc-openapi | API documentation | Swagger UI at `/swagger-ui.html` (admin only) |

## 3.4 Database and infrastructure

### MySQL 8.4

A relational database: data is stored in tables with rows and columns, and tables are linked with foreign keys. EventHub uses InnoDB transactions (all-or-nothing changes) with the default isolation level REPEATABLE READ.

### Docker and Docker Compose

Docker runs programs in **containers**: small, isolated boxes that contain everything the program needs. `docker-compose.yml` starts two containers with one command: MySQL (port 3306) and Mailpit (a fake email server with a web inbox at port 8025).

>> A container is like a lunch box: the food (MySQL) comes with its own plate and spoon, so it works the same on every table (laptop).

### Mailpit

In development, emails must not go to real people. Mailpit accepts every email on port 1025 and shows it in a web inbox at http://localhost:8025.

## 3.5 Quality tools

| Tool | What it does |
|---|---|
| JUnit 5 | Runs Java tests (`@Test`) |
| Mockito | Creates fake objects ("mocks") so one class can be tested alone |
| AssertJ | Readable checks: `assertThat(x).isEqualTo(5)` |
| MockMvc | Calls controllers like a browser would, without a real server |
| Testcontainers | Starts a real, fresh MySQL 8.4 in Docker for the tests |
| JaCoCo | Measures which lines the tests ran (coverage report) |
| Vitest + React Testing Library | Runs React component tests in a fake browser (jsdom) |
| oxlint | Finds mistakes in JavaScript, e.g. a variable that does not exist |
| GitHub Actions | Runs all of the above on every push |
| Postman | Manual and scripted API calls (collection with 43 checks) |
