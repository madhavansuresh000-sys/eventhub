# 13. Troubleshooting

Each entry: what you see, why it happens, and how to fix it. Most of them really happened while building EventHub.

## 13.1 Setup and start-up

| What you see | Why | Fix |
|---|---|---|
| `docker compose up` → "error during connect" / "cannot find the file specified" | Docker Desktop is not running | Start Docker Desktop, wait for "Engine running", try again |
| Backend: "Communications link failure" | MySQL container not started or still starting | `docker compose up -d`, then `docker compose ps` until mysql is "healthy" |
| Backend: "Access denied for user 'eventhub'" | `.env` passwords differ from the ones the MySQL volume was created with | Use the original passwords, or reset: `docker compose down -v` (deletes the data!) and start again |
| Backend: "Could not resolve placeholder 'MYSQL_USER'" | No `.env` file, or the backend was started from a different folder | Create `.env` from `.env.example`; start the backend from the `backend` folder (it imports `../.env`) |
| Backend: "app.jwt.secret must be at least 32 characters" | `JWT_SECRET` too short | Generate one: `python -c "import secrets; print(secrets.token_hex(32))"` |
| Backend: "Port 8080 was already in use" | Another backend is still running (IntelliJ + command line) | Stop the other one; on Windows find it with `netstat -ano` (look for :8080) and stop it with `taskkill /PID <pid> /F` |
| Backend: "Schema-validation: wrong column type" | An entity field does not match the table | Fix the entity (e.g. `@JdbcTypeCode(SqlTypes.TINYINT)`) or add a new migration - never edit an old one |
| Backend: "Migration checksum mismatch" | An already-applied migration file was edited | Undo the edit and put the change in a new V10 file |
| Frontend: blank page, "Backend: DOWN" in the footer | Spring Boot not running or crashed | Check the backend console; open http://localhost:8080/api/health |
| `npm run dev` → "Port 5173 is in use" | A second Vite is running | Close it, or accept the other port Vite suggests |
| Vite does not pick up a change | The file watcher missed a very fast second save | Save the file again or restart `npm run dev` |
| `mvnw` "Permission denied" (Linux CI) | The wrapper lost its executable bit | `git update-index --chmod=+x backend/mvnw` and commit |
| IntelliJ will not start (".port" lock error) | A crashed IntelliJ left a lock file | Close all IntelliJ processes, delete the `.port` file in the IntelliJ config folder, start again |

## 13.2 Login and security

| What you see | Why | Fix |
|---|---|---|
| "Wrong email or password." with the right password | A typo, an extra space from copy-paste, or the demo accounts were created with an older `DEMO_PASSWORD` | Copy exactly; the seeder only creates missing accounts, it never changes an existing password |
| 429 "Too many wrong passwords" | 5 wrong tries from this address | Wait 15 minutes (or restart the backend in development - the lock is kept in memory) |
| 403 on every POST from Postman | No CSRF header | First call `GET /api/auth/me`, copy the `XSRF-TOKEN` cookie value into an `X-XSRF-TOKEN` header |
| 403 "You do not have permission to do this." | Logged in, but not the right role or club | Log in as the right user (e.g. the organizer of that club) |
| Logged out after some hours | The JWT expires after 8 hours | Log in again (by design) |
| Swagger page gives 401 | Swagger is admin-only | Log in as the admin in the React app, then open Swagger in the same browser |

## 13.3 Booking, payment and gate

| What you see | Why | Fix |
|---|---|---|
| "You already have seats for …" | One active booking per student per event | Open My tickets; cancel the old one first if needed |
| The hold timer ran out | Not paid within 10 minutes | Book again; the seats were returned to other students |
| Payment done, page keeps waiting | The webhook has not arrived (Stripe CLI not running) | The page calls "verify" automatically; with Stripe, run `stripe listen --forward-to localhost:8080/api/payments/stripe/webhook` |
| Scanner: "INVALID - not a ticket for this event" | Wrong event chosen, or the ticket is for another event | Pick the right event in "Gate duty for" |
| Scanner camera does not start | No camera, or the browser blocked it | Allow camera access, or type the code |
| No certificate after the event | The ticket was never scanned at the gate, or the event is not over yet | Only attendees get certificates (by design) |
| No email arrived | Development sends to Mailpit, not real mail | Open http://localhost:8025 |

## 13.4 Tests

| What you see | Why | Fix |
|---|---|---|
| "Could not find a valid Docker environment" | Testcontainers needs Docker | Start Docker Desktop |
| Tests fail on Windows with file-locked errors | The backend is running from the same `target` folder | Stop the backend while running `mvnw test` |
| A test passes alone but fails with the others | Data left behind by a non-transactional test | Non-transactional tests must clean up (see `BookingConcurrencyTest.cleanUp`) |
| Vitest: "unhandled rejection" although the page catches it | Vitest 5 quirk with `mockReset()` + `mockRejectedValue` | Use `vi.clearAllMocks()` in `beforeEach` |
| Lint passes but the page crashes with "X is not defined" | The undefined-variable rule was off | Now fixed: `.oxlintrc.json` has `"no-undef": "error"` |

## 13.5 How to investigate any problem

1. **Read the message.** The backend's Problem Details `detail` usually says exactly what is wrong.
2. **Browser DevTools** (F12): Console for JavaScript errors, Network for the failing request and its answer.
3. **Backend console**: the full exception and, in development, every SQL statement (`show-sql: true`).
4. **Reproduce with a test.** Write a failing test first, then fix the code until it passes - the bug can never come back unnoticed.

# 14. Lessons learned

These are the most valuable lessons of the project - good material for interviews.

## 14.1 Technical lessons

1. **The server must own every rule.** The page can hide a button, but anyone can call the API with Postman. Every rule lives in a service and is tested there.
2. **Concurrency is real.** "Read, then write" breaks when two people do it at once. Optimistic locking (`@Version`) with a retry fixes it without slow locks - and a test with 100 threads proves it.
3. **Lock order prevents deadlocks.** Two transactions touching the same rows in a different order can wait for each other forever. Always update the event row first.
4. **One step is safer than two.** "Check if unused, then mark as used" is two steps with a gap; `UPDATE … WHERE checked_in_at IS NULL` is one step with no gap.
5. **Know your isolation level.** Under REPEATABLE READ a transaction keeps seeing its first snapshot; decide from the result of your own UPDATE instead of reading again.
6. **Do side effects after commit.** Emails and other outside actions must wait until the database change is final (outbox idea).
7. **Idempotency.** Anything that can arrive twice (webhooks, double clicks) must give the same result the second time: use unique keys.
8. **Let the database protect itself.** UNIQUE, CHECK and foreign keys stop wrong data even when Java has a bug.
9. **Random, not sequential, public codes.** Ticket and certificate numbers must not be guessable.
10. **Measure before optimising.** Paging, `@EntityGraph`, `@BatchSize`, a 60-second cache and code splitting were each added for a measured reason.

## 14.2 Working lessons

1. **Small steps, each tested and committed.** 60+ commits, CI green nearly all the time.
2. **Checklists with "done when".** Each phase ended only when its checks passed.
3. **A test for every bug.** The flaky JWT test and the scanner crash each got a test that would have caught them.
4. **Automate the demo.** The Edge tour found a real bug that unit tests missed, and it produced every screenshot in this guide.
5. **Write for the reader.** Comments in simple English explain *why*, not only *what*.

# 15. Deployment plan and future scope

## 15.1 Deployment plan (Phase 9)

| Part | Planned host | Settings (environment variables, never in code) |
|---|---|---|
| Backend (Docker image or JAR) | Render or Railway | `SPRING_PROFILES_ACTIVE=prod`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, `MAIL_*`, `STRIPE_*` |
| Database | Managed MySQL (e.g. Aiven or Railway) | automatic backups |
| Frontend (static files from `npm run build`) | Vercel or Netlify | a rewrite that forwards `/api/*` to the backend, so the cookie stays on one site |
| Email | a free SMTP service (optional) | `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD` |

The `prod` profile already switches on secure cookies, requires all secrets (no defaults), and refuses the fake payment gateway. The "done when" check of Phase 9: *a friend can open the link on their phone, register, book, get a QR ticket and download a certificate.*

## 15.2 Future scope

| Idea | Why it matters | How |
|---|---|---|
| Password reset by email | Students forget passwords | one-time token table, email link, expiry |
| Real volunteer management page | Organizers add and remove gate volunteers | endpoints on `club_members` with role VOLUNTEER |
| Installable app / offline scanner | Weak Wi-Fi at the gate | Progressive Web App, queue scans and sync later |
| UPI payments | Most Indian students pay with UPI | Razorpay behind the same `PaymentGateway` interface |
| Several servers | More users | Redis for the login lock and the cache; sticky-free design already (stateless JWT) |
| Several colleges | One platform for a whole university | a `college_id` on clubs and users, filtered everywhere |
| Recommendations | Students discover more events | suggest events by tags the student booked before |

# 16. Glossary

| Term | Meaning in simple words |
|---|---|
| API | A set of URLs a program can call to use another program's features |
| Audit log | A diary of who changed what and when |
| BCrypt | A slow, salted way of hashing passwords so they cannot be turned back |
| Bean | An object created and managed by Spring |
| Cache | A short-term memory of an answer, to avoid computing it again |
| CI (continuous integration) | Automatic build and tests on every push |
| Component (React) | A reusable piece of the screen, written as a function |
| Container (Docker) | A small isolated box that runs one program with everything it needs |
| CORS | Browser rule about which websites may call an API |
| CSRF | An attack where another website makes your browser send a request; blocked with a secret header |
| Deadlock | Two transactions waiting for each other forever |
| Dependency injection | Spring hands a class the objects it needs, instead of the class creating them |
| DTO | A small class or record describing the shape of JSON sent or received |
| Entity | A Java class that represents one database table |
| Flyway migration | A numbered SQL file that changes the database in a controlled order |
| Foreign key | A column that must point to an existing row in another table |
| Hash | A one-way fingerprint of data |
| HttpOnly cookie | A cookie JavaScript cannot read |
| Idempotent | Doing it twice gives the same result as doing it once |
| Integration test | A test of several parts working together (here with a real database) |
| JPA / Hibernate | The standard and the library that map Java objects to tables |
| JPQL | A query language like SQL, but written with entity and field names |
| JWT | A signed token that says who you are, valid until it expires |
| Mock | A fake object used in a test |
| Optimistic locking | Save only if nobody else changed the row since you read it (version check) |
| Outbox pattern | Save the message with the change; deliver it only after the change is committed |
| Race condition | A bug that happens only when two things run at the same moment |
| Redux slice | One area of the shared frontend state, with its actions |
| Repository | An interface that reads and writes one kind of entity |
| REST | A style of API built on URLs and HTTP methods |
| Specification | A reusable piece of a WHERE clause that can be combined with others |
| Testcontainers | A library that starts real databases in Docker for tests |
| Thunk | A Redux action that does async work (like an API call) |
| Transaction | A group of database changes that succeed or fail together |
| Webhook | A call from another company's server to ours when something happens (e.g. "paid") |
