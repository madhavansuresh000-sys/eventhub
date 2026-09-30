# Session Summary: 28 September 2026 (about 10:47–12:21) — PHASE 1 COMPLETE

## What we did in this session
1. **Fixed IntelliJ "Start Failed".** A broken lock file (`.port`) blocked IntelliJ from starting. The cause was Claude launching IntelliJ from its background tool. The fix was renaming the cache folder `%LOCALAPPDATA%\JetBrains\IdeaIC2025.2`.
   - **Rule: always open IntelliJ (and Docker, Postman) yourself from the Start menu.**
   - Optional cleanup (you can delete these yourself): `%LOCALAPPDATA%\JetBrains\IdeaIC2025.2_broken_2026-09-28` and `IdeaIC2025.2_old2`.
2. **IntelliJ fixes done:** SDK = JDK 26, language level = 25, compiler output = `backend\out`, Lombok plugin installed.
3. **Postman:** it was already installed (12.29.5). First test `GET postman-echo.com/get` returned **200 OK**.
4. **Phase 1 Steps 4–8 built, tested and pushed to GitHub:**
   - **Step 4:** React 19 + Vite 8, Tailwind 4, React Router 7, Redux Toolkit, Axios (`frontend/`)
   - **Step 5:** `docker-compose.yml` with MySQL 8.4 (port 3306) and Mailpit (http://localhost:8025). Passwords are in `.env` (not on GitHub).
   - **Step 6:** `application.yml` with **dev** and **prod** profiles. Spring Boot now connects to MySQL, so the "DataSource" error is fixed.
   - **Step 7:** `/api/health` returns `{"status":"UP"}`. Swagger is at `/swagger-ui.html`. Other URLs return 401. There are 3 tests, all passing. The React page shows **"Backend: UP"** in green.
   - **Step 8:** GitHub Actions CI runs for the backend and the frontend. **Both are green.**
5. **Documents (Word + PDF)** in `02_EventHub_Practice_Project\Phase_1_Creating_the_Project\`:
   - `Phase1_Explained_2026-09-28_1146`: the whole of Phase 1 in simple English, with diagrams
   - `Phase1_Step9_Sketches_2026-09-28_1156`: 5 sketches, each with "My changes" lines
6. **Step 9 sketches (approved):** 4 page wireframes (Home, Event details, Login, My Bookings) and the ER diagram (users, events, bookings). They are in `docs\sketches\`.

## Phase 1 progress
| # | Step | Status |
|---|---|---|
| 1 | Install tools | ✅ |
| 2 | GitHub repository | ✅ |
| 3 | Spring Boot project + IntelliJ setup | ✅ |
| 4 | React app with Vite | ✅ |
| 5 | docker-compose.yml (MySQL + Mailpit) | ✅ |
| 6 | Connect Spring Boot to MySQL | ✅ |
| 7 | /api/health + Swagger | ✅ |
| 8 | GitHub Actions CI | ✅ green |
| 9 | Sketches | ✅ approved by Madhavan (can still be changed before Phase 3) |

**"Done when" checks:** "Backend: UP" ✅ · `docker compose up` ✅ · green CI ✅

## Daily routine: how to start everything
1. Open **Docker Desktop** (Start menu) and wait for "Engine running". The containers start automatically. If they don't, run `docker compose up -d` in `02_EventHub_Practice_Project`.
2. Open **IntelliJ** (Start menu) and run `EventhubApplication`. The backend runs on http://localhost:8080.
3. In `frontend\`, run `npm run dev` and open http://localhost:5173.

## Next session: start here
**Phase 1 is complete** 🎉 Start **Phase 2: Backend**:
1. Read `02_EventHub_Practice_Project\Phase_2_Backend\` (the checklist).
2. Turn the ER diagram (users, events, bookings) into Flyway migrations (real MySQL tables).
3. Build JPA entities and the first REST APIs for events, and test them in Postman and Swagger.

## Homework (optional)
1. Why do we keep passwords in `.env` and not on GitHub?
2. What does HTTP **401** mean? And **201**?
3. What is Mailpit used for?
4. In the ER diagram, why is `user_id` stored in `bookings` and not in `users`?
