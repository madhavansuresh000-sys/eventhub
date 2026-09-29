# EventHub 🎟️

**BookMyShow for your college.** A full stack event ticketing platform built with **Spring Boot + React + MySQL**.

From poster to gate: **Plan → Approve → Publish → Book (10-min seat hold) → Waitlist → QR check-in → Certificate**

## Signature features
1. Booking engine that never oversells (10-minute seat hold + optimistic locking)
2. Smart waitlist that offers freed seats automatically
3. QR e-tickets scanned by volunteers at the gate
4. PDF certificates only for students who attended, with a verify link
5. Approval workflow and organizer analytics dashboard

## Tech stack
| Layer | Tools |
|---|---|
| Backend | Java, Spring Boot, Spring Data JPA, Spring Security (JWT), Flyway |
| Frontend | React (Vite), Tailwind CSS, React Router, Redux Toolkit, Axios |
| Database | MySQL 8 (runs in Docker) |
| Tools | Docker, GitHub Actions, Postman, Swagger UI |

## Folder structure
```
backend/               Spring Boot API        (localhost:8080)
frontend/              React app              (localhost:5173)
00_Project_Documents/  Guide, master plan, phase plan
Phase_0 … Phase_9/     Checklist for each phase
```

## How to run (on your laptop)
1. **Database + email inbox** (Docker Desktop must be running):
   ```
   copy .env.example .env      (first time only; then set your own passwords)
   docker compose up -d
   ```
   MySQL on `localhost:3306`, Mailpit inbox at http://localhost:8025
2. **Backend:** open `backend/` in IntelliJ and run `EventhubApplication` (or `mvnw spring-boot:run`)
   - Health: http://localhost:8080/api/health
   - API docs: http://localhost:8080/swagger-ui.html (admin only: log in as the admin on the React app first)
3. **Frontend:** in `frontend/` run `npm install` (first time) and `npm run dev`, then open http://localhost:5173
4. **Try the API in Postman:** Import → `postman/EventHub.postman_collection.json` → Run collection (25 requests with checks)

Automated tests (`mvnw test`) start their own throwaway MySQL with Testcontainers (Docker must be running), so your own data never breaks them. Coverage report: `backend/target/site/jacoco/index.html`.

## Status
![CI](https://github.com/madhavansuresh000-sys/eventhub/actions/workflows/ci.yml/badge.svg)

✅ Phase 0: Foundations — complete (28 Sep 2026): Java console app, JS page, SQL practice (`Phase_0_Foundations/practice/`)

✅ Phase 1: Creating the project — complete (28 Sep 2026). Sketches: `docs/sketches/`

✅ Phase 2: Backend — complete (28 Sep 2026): 9 tables, event search/filter/pagination, approval workflow, clean JSON errors, 44 tests, Postman collection

✅ Phase 3: Frontend — complete (28 Sep 2026): React 19 + Tailwind 4 + Redux Toolkit, 25 pages, dark mode, mobile

✅ Phase 4: Connecting — complete (28 Sep 2026): organizer and admin pages on the real API, CORS

✅ Phase 5: Login & roles — complete (28 Sep 2026): JWT in an httpOnly cookie, CSRF, club roles, login lock, audit log

✅ Phase 6: Bookings & payments — complete (29 Sep 2026): seat holds, optimistic locking (100 threads / 10 seats test), Stripe Checkout or a built-in test page, idempotent webhooks

✅ Phase 7: Signature features — complete (29 Sep 2026): smart waitlist, email + in-app notifications, QR gate check-in, PDF certificates + public verify page, feedback stars, analytics dashboard (cached)

✅ Phase 8: Testing & polish — complete (29 Sep 2026): 133 backend tests (Testcontainers MySQL, Mockito unit tests, 91% service coverage), 12 React tests (Vitest + Testing Library), Swagger/Actuator admin-only, contrast + mobile fixes, code splitting

🚧 Next: Phase 9 — Launch

## Known limitations (practice project)
- **Volunteers page** (organizer area) still shows sample names. Real volunteers are club members with the VOLUNTEER role (they can already use the gate scanner); a page to add/remove them was left out on purpose.
- **Forgot password** is not built (the page says so).
- **Stripe** was only tested with mocks (unit tests), never against real Stripe; the live card test moved to the main project, TriVoKo.
- Login lock (5 wrong passwords) and the analytics cache live in memory: fine for one server, a shared store (e.g. Redis) would be needed for several.
