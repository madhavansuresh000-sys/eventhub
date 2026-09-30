# Session Summary: 28 September 2026 (about 10:47–14:20)

## Big picture
| Phase | Status |
|---|---|
| Phase 0 · Foundations (console app) | ✅ Complete |
| Phase 1 · Creating the project | ✅ Complete |
| Phase 2 · Backend (database + APIs) | ✅ Complete |
| Phase 3 · Frontend (pages) | 🟡 8 of 11 steps done |
| Phase 4 – 9 | ⬜ To do |
| Main e-commerce project **TriVoKo** | ⬜ After EventHub |

EventHub overall: about 35% (3 full phases + most of Phase 3).

## What we did today
1. **Fixed IntelliJ** (broken `.port` lock). **Rule: open IntelliJ, Docker and Postman yourself from the Start menu.**
2. **Phase 1 finished** (steps 4–9): React app, Docker MySQL + Mailpit, database connection, `/api/health` + Swagger, GitHub CI (green), sketches approved.
3. **Phase 2 finished** (10 steps): 9 tables + sample data (Flyway), entities, repositories, DTOs, services, event APIs (search, filter, sort, pages), approval workflow, clean JSON errors, Postman collection (25 requests), 44 automatic tests, tests on their own database `eventhub_test`.
4. **Phase 0 finished** (Claude built, you reviewed): Java console app with SoldOutException and Queue waitlist (13 checks pass), JavaScript event page, 10 SQL queries.
5. **Phase 3 steps 1–8**: design + dark mode, shared components, all routes + 404, Home / Events / Event details / Club (real API), Login / Register (live form checks), student pages (checkout with 10-minute seat hold, QR ticket, My tickets, waitlist, certificates), organizer area (dashboard, create/edit event, submit, volunteers), gate scanner (green LET IN / red STOP).
6. **Documents**: `Phase1_Explained_2026-09-28_1146` and `Phase1_Step9_Sketches_2026-09-28_1156` (Word + PDF).

## Phase 3 progress
| # | Step | Status |
|---|---|---|
| 1 | Design, colours, dark mode | ✅ |
| 2 | Shared components | ✅ |
| 3 | Routes + 404 | ✅ |
| 4 | Public pages (real API) | ✅ |
| 5 | Login and Register | ✅ |
| 6 | Student pages | ✅ |
| 7 | Organizer pages | ✅ |
| 8 | Gate scanner | ✅ |
| 9 | Admin pages (approval queue, overview) | ⬜ next |
| 10 | Redux store (auth, cart, notifications) | ⬜ |
| 11 | Mobile check on every page | ⬜ |

## How to start everything next time
1. Open **Docker Desktop** (Start menu). Wait for "Engine running". MySQL and Mailpit start by themselves (if not: `docker compose up -d` in `02_EventHub_Practice_Project`).
2. Open **IntelliJ** (Start menu) → project `backend` → run `EventhubApplication` → http://localhost:8080
3. Terminal in `02_EventHub_Practice_Project\frontend` → `npm run dev` → http://localhost:5173
4. Optional: Postman → EventHub collection → Run.

## Next session: start here
1. **Phase 3 Step 9: Admin pages** (approval queue: approve / send back with a reason; admin overview).
2. Step 10: Redux store. Step 11: mobile check. Then **Phase 3 is complete** → Phase 4 (connect everything to the backend).

## Things to remember
- Sample data (tickets, organizer events, gate scans) resets when a page is reloaded, until Phase 4–6 connect the backend.
- If a page goes blank after an edit, Vite may have missed a file change: save the file again (or restart `npm run dev`).
- Your homework: answer the 4 questions at the end of `Phase_0_Foundations\practice\README.md` (class vs object, List vs Queue, checked exceptions, WHERE vs HAVING).
- Some SESSION_LOG times after 14:00 were written ahead of the clock (about 10–20 minutes early); the order of work is correct.
