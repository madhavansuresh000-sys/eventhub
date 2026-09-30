# 18. How to present EventHub (demo script)

This chapter is a ready-made script for a 10-12 minute presentation with a live demo. The same flow is used in the narrated demo video (Tamil audio, English subtitles).

## 18.1 Before you start (checklist)

1. Start Docker Desktop, then `docker compose up -d`.
2. Start the backend (IntelliJ or `mvnw spring-boot:run`) and check http://localhost:8080/api/health.
3. Start the frontend (`npm run dev`) and open http://localhost:5173.
4. Open Mailpit (http://localhost:8025) in a second tab.
5. Keep the demo password ready (from `.env`), and the PowerPoint open on slide 1.
6. Zoom the browser to 110-125% so the audience can read it.
7. Plan B: if Wi-Fi or a laptop fails, use the screenshots in the slides or play the demo video.

## 18.2 The flow (about 11 minutes)

| Time | Show | Say (short version) |
|---|---|---|
| 0:00 | Slides 1-3 | "EventHub runs college events end to end. Today colleges use WhatsApp and Forms, which causes overbooking, fake tickets and late certificates." |
| 1:30 | Slides 4-7 | "Five kinds of users. React frontend, Spring Boot backend, MySQL. Every request passes security, controller, service, repository." |
| 3:00 | Live: home → search "robotics" → event page | "Search and filters run on the server; visitors see only published events." |
| 4:00 | Live: log in as Ravi → Book now → checkout timer → Pay → QR ticket | "Seats are held 10 minutes. Optimistic locking guarantees nobody gets the same last seat - proven with 100 threads." |
| 5:30 | Live: log in as Priya → Scanner → type the code twice | "One conditional UPDATE: the first scan lets in, the second says ALREADY USED with time and name." |
| 6:30 | Live: Ravi's certificate → public verify page | "Only attendees of finished events get one; anyone can verify the number." |
| 7:30 | Live: Madhavan → create event → submit; admin → approve | "Draft, pending approval, published - a small state machine; every step in the audit log." |
| 8:30 | Live: organizer analytics | "The database counts with GROUP BY; the answer is cached 60 seconds." |
| 9:00 | Live: Kavya opens /admin | "The page hides it, and the server answers 403 anyway." |
| 9:30 | Slides 16-19 | "BCrypt, httpOnly JWT, CSRF, login lock. 146 tests, 91% coverage, CI on every push. Hard problems: deadlock, snapshot, flaky test." |
| 10:30 | Slides 20-21 | "Next: deployment, password reset, UPI. Thank you - questions?" |

## 18.3 Tips for presenting

- **Tell a story, not a feature list**: follow Ravi from "I want to go to the hackathon" to "I have a certificate".
- **Show one hard thing well** instead of ten things quickly - the gate double-scan is the best "wow" moment.
- **Say numbers**: 100 threads, 10 seats, exactly 10 bookings; 146 tests; 91% coverage.
- **Admit limits honestly** ("Stripe was tested with mocks; the live card test is planned for my main project").
- If something fails live, stay calm, explain what should happen, and show the screenshot in the slides.

# 19. How EventHub was built: the phase-by-phase story

Each phase had its own checklist document (in the `Phase_*` folders) with steps and "done when" checks. A phase was finished only when every check passed.

| Phase | Name | What was built | "Done when" (examples) |
|---|---|---|---|
| 0 | Foundations | Java console version (classes Event, Student, Booking; a Queue waitlist; a custom SoldOutException), a small JavaScript page, SQL practice | Booking, sold out, cancel and waitlist work in the console |
| 1 | Creating the project | Git repository, Spring Boot 4.1 backend, React + Vite frontend, Docker Compose (MySQL + Mailpit), health check, CI, first page sketches | React shows "Backend: UP"; `docker compose up` works; CI green |
| 2 | Backend | 9 tables (Flyway V1-V2), entities, repositories, DTOs, EventService rules, search with filters and paging, approval state machine, error handling, Postman collection | 44 tests; Postman 43 checks green |
| 3 | Frontend | Design tokens and dark mode, UI components, all 25 pages with sample data where needed, Redux store, mobile check at 375 px | Every page works on a phone, light and dark |
| 4 | Connecting | CORS; organizer and admin pages on the real API; server field errors shown in forms | Create → submit → approve works through the UI |
| 5 | Security | Register/login, BCrypt, JWT in httpOnly cookie, CSRF, club roles with @PreAuthorize, login lock, audit log, demo accounts | Student gets 403 on admin APIs; an organizer cannot edit another club's events |
| 6 | Booking and payments | Seat holds, optimistic locking + retry, expiry job, payment gateway (Stripe / test page), idempotent webhook, late-payment refunds, My tickets | 100 threads / 10 seats → exactly 10 bookings |
| 7 | Signature features | Smart waitlist, notifications + emails + reminders, QR tickets, gate scanner, PDF certificates + verify, feedback, analytics + cache | Cancel → offer email to #1 waitlisted; same ticket twice → ALREADY USED; only checked-in students get a certificate |
| 8 | Testing and polish | JaCoCo, Mockito unit tests, Testcontainers, React tests, admin-only Swagger/Actuator, secret scan, contrast and mobile fixes, code splitting, cleanup | CI green; service coverage ≥ 70% (reached 91%) |
| 9 | Launch | Deployment, README, demo video, v1.0 tag | A friend can register, book, get a QR ticket and a certificate on their phone |

>> Building in phases is like building a house: foundation, walls, wiring, plumbing, painting, then the house-warming. Each stage is inspected before the next one starts, so a problem is found while it is still small.

# 20. How to change EventHub (developer how-to)

Four common tasks, step by step, so a new developer can extend the project safely.

## 20.1 Add a new column (example: a "meeting link" for online events)

1. **Migration** - create `V10__add_meeting_link.sql` (never edit V1-V9):

```
ALTER TABLE events ADD COLUMN meeting_link VARCHAR(300);
```

2. **Entity** - add the field to `Event`:

```
@Column(name = "meeting_link", length = 300)
private String meetingLink;
```

3. **DTOs** - add `meetingLink` to `EventRequest` (with `@Size(max = 300)` and maybe `@URL`) and to `EventDetailResponse`; map it in `EventMapper` and `EventService.applyRequest`.
4. **Frontend** - add a `TextField` to `EventFormPage` and show the link on `EventDetailsPage` for ticket holders.
5. **Test** - extend `EventServiceTest`: create an event with a link, read it back.
6. Run `mvnw test`, `npm test`, commit, push; CI must be green.

## 20.2 Add a new endpoint (example: "my upcoming events count")

1. Service method with the rule: `public long upcomingCount(Long userId)` in `BookingService`, `@Transactional(readOnly = true)`.
2. Repository query: a `@Query("select count(b) from Booking b where ...")` method.
3. Controller: `@GetMapping("/api/bookings/mine/upcoming-count")` returning `Map.of("count", n)`.
4. Security: it is under `/api/**` and not public, so it already needs login - check `SecurityConfig` if you want different rules.
5. Test with MockMvc: log in with `TestAccounts`, call the URL, check the number; also check that a visitor gets 401.
6. Frontend: add `fetchUpcomingCount` in `api/bookings.js` and use it with `useAsync` on a page.

## 20.3 Add a new page

1. Create `src/pages/MyPage.jsx` (a function component that returns JSX).
2. Add a route in `App.jsx`; wrap it in `RequireAuth` if it needs login; use `lazy(() => import(...))` if it is large or used by few people.
3. Add a link in `Navbar.jsx` or a sidebar.
4. Use the UI components (`Card`, `Button`, `EmptyState`, `Skeleton`) so it matches the design and dark mode.
5. Write a component test with React Testing Library if it has logic.
6. Check it at 375 px width and in dark mode.

## 20.4 Add a new business rule (example: max 2 active bookings per student per day)

1. Write a **failing test** first in `BookingFlowTest`: book three times on the same day, expect the third to answer 409 with a clear message.
2. Add the check in `BookingService.holdOnce`, throwing `BusinessRuleException` with a friendly sentence.
3. Run the test until it passes; run all tests.
4. Show the message in the UI - it already appears automatically, because pages display the `detail` of any 409.

> Golden rule for every change: the **server** enforces the rule, a **test** proves it, and **CI** is green before the change counts as done.
