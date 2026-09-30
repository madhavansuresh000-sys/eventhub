# Session Summary: 27 September 2026 (about 21:45–22:29)

## What we did in this session
1. **Chose Phase 1** (Creating the Project) and explained it: the 9 steps, the big-picture diagram (React → Spring Boot → MySQL in Docker → GitHub) and the new words.
2. **Step 1, install tools: nearly done.**
   - Installed: Java JDK 26 (`C:\Program Files\Java\jdk-26`), IntelliJ IDEA Community, VS Code, Node.js 24, Git, Docker Desktop (signed in, `hello-world` test passed).
   - **Not installed yet: Postman.** Maven and MySQL are not needed (we use `mvnw` and Docker).
3. **Step 2, GitHub: done ✅**
   - Local Git repo in `02_EventHub_Practice_Project` (README.md + .gitignore + all plan docs).
   - Public GitHub repo: **https://github.com/madhavansuresh000-sys/eventhub** (branch `main`).
4. **Step 3, Spring Boot backend: done ✅**
   - Generated from start.spring.io: Spring Boot **4.1.1**, Java **25**, Maven, package `com.eventhub`, artifact `eventhub-backend`.
   - Dependencies: Web, Data JPA, Validation, Security, MySQL, Flyway, Actuator, Mail, Cache, Lombok.
   - `mvnw compile` succeeded. Pushed to GitHub (commit "Phase 1 step 3").
   - It will **not start yet** ("Failed to configure a DataSource") until MySQL runs (steps 5–6). This is expected.
5. **Opened the backend in IntelliJ.** It loaded (Maven project, branch main). IntelliJ imported settings from VS Code.

## Stopped here: 2 small fixes in IntelliJ are NOT done yet
- [ ] **Fix 1: Setup SDK.** Yellow bar "Project JDK is not defined" → **Setup SDK** → choose **jdk-26**, or *Add JDK from disk* → `C:\Program Files\Java\jdk-26`. This removes the red errors.
- [ ] **Fix 2: Lombok plugin.** Pop-up "Suggested plugin Lombok" → **Configure plugins…** → **Install** → Restart IDE.

## Phase 1 progress
| # | Step | Status |
|---|---|---|
| 1 | Install tools | ✅ (Postman left) |
| 2 | GitHub repository | ✅ |
| 3 | Spring Boot project | ✅ (IntelliJ fixes 1 & 2 pending) |
| 4 | React app with Vite | ⬜ next |
| 5 | docker-compose.yml (MySQL + Mailpit) | ⬜ |
| 6 | Connect Spring Boot to MySQL | ⬜ |
| 7 | /api/health + Swagger | ⬜ |
| 8 | GitHub Actions CI | ⬜ |
| 9 | Paper sketches | ⬜ |

## Next session: start here
1. Open IntelliJ (it reopens the `backend` project) → do **Fix 1** (JDK 26) and **Fix 2** (Lombok) → check that there are no red marks.
2. Install **Postman**.
3. Say "next" → **Step 4: React frontend** (Vite + Tailwind + React Router + Redux Toolkit + Axios).

## Homework (optional)
1. What is the difference between frontend and backend?
2. Why do we run MySQL in Docker instead of installing it?
3. What does `git push` do?
