# Session Summary: 28 September 2026 (afternoon, about 17:05–18:32)

## Big picture
| Phase | Status |
|---|---|
| Phase 0 · Foundations (console app) | ✅ Complete |
| Phase 1 · Creating the project | ✅ Complete |
| Phase 2 · Backend (database + APIs) | ✅ Complete |
| Phase 3 · Frontend (pages) | ✅ Complete (approved today) |
| Phase 4 · Connecting frontend and backend | ✅ Complete (approved today) |
| Phase 5 · Security | ✅ Complete (approved today) |
| **Phase 6 · Booking and payments** | 🟡 **Next** (plan below, nothing built yet) |
| Phase 7 – 9 | ⬜ To do |
| Main e-commerce project **TriVoKo** | ⬜ After EventHub |

EventHub overall: about 65% (6 of 10 phases, 0 to 5, complete).

```
Phase:  0    1    2    3    4    5    6    7    8    9
        ✅   ✅   ✅   ✅   ✅   ✅   ⏭️   ⬜   ⬜   ⬜
```

## What we did this session
1. **TriVoKo docs**: new versions of the Learning Notes and the EventHub Project Guide (v1.1, Word + PDF) with the name TriVoKo and Java 25 / Spring Boot 4.
2. **Phase 3 finished** (steps 9–11): admin pages (approval queue, overview), Redux store (auth, cart, notifications + student/organizer/admin slices), mobile check of 25 pages (fixed a sideways-scroll bug and small tap targets).
3. **Phase 4 finished**: CORS, organizer and admin pages on the real API (`/api/organizer/**`, `/api/admin/**`), server errors shown under the right form field. Test: "Docker for Beginners" created → approved → on the Events page.
4. **Phase 5 finished**: real login with JWT in an httpOnly cookie, BCrypt passwords, CSRF protection, roles and club permissions, audit log, login rate limit, React login/register/protected pages. 74 backend tests. Every role tested in the browser.

## How security works now (diagram)
```
 Browser ──(🍪 JWT + 🍪 XSRF + header)──▶ ① JwtCookieFilter  who are you?
                                          ② CSRF check        did OUR page send it?
                                          ③ URL rules         /api/admin/** = ADMIN
                                          ④ @PreAuthorize     organizer of THIS club? (database)
                                          ⑤ Controller → Service → MySQL (+ audit log)
 401 = "who are you?"   403 = "I know you, but not this room"
```

## Demo accounts (only on your laptop, never on a real server)
| Email | Role |
|---|---|
| admin@eventhub.test | Admin |
| madhavan@eventhub.test | Coding Club organizer |
| kavya@eventhub.test | Cultural Club organizer |
| priya@eventhub.test | Coding Club volunteer |
| ravi@eventhub.test | Student |

Password for all: **DEMO_PASSWORD in the `.env` file** (not written here on purpose). `.env` also has **JWT_SECRET**. Never put `.env` on GitHub (it is in .gitignore).

## Phase 6 plan (next time)
```
 Student               EventHub backend                          Stripe (test mode)
   │ Book 2 seats ──▶ ① HOLD: seats 40→38, booking HELD, 10-min timer
   │ Pay ₹200     ──▶ ② Stripe Checkout session ───────────────▶ card page (4242…)
   │ ◀───────────────────────────── back to EventHub after paying ◀┘
   │                  ③ webhook signed by Stripe → CONFIRMED (only once, even if sent twice)
   │                  ④ every minute: unpaid holds older than 10 min → EXPIRED, seats back
```
- 11 steps: bookings + payments tables, hold API, optimistic locking + retry, expiry job, free events confirm at once, Stripe Checkout, webhook with signature check, idempotency, cancel, **concurrency test (100 people, 10 seats = exactly 10 bookings)**, React pages.
- Payments behind a switch: **no Stripe keys → built-in test payment page** (dev only, same confirm logic); **Stripe keys in `.env` → real Stripe test mode**.
- **Your to-do for the real 4242 card test:** create a free Stripe account (dashboard.stripe.com), stay in **Test mode**, copy the test **secret key** (`sk_test_…`) into `.env` as `STRIPE_SECRET_KEY=`. Claude cannot create accounts or handle keys for you.
- Library: `com.stripe:stripe-java` (use the latest non-beta version).

## Still sample data (on purpose)
| What | Real in |
|---|---|
| My tickets, ticket QR | Phase 6 |
| Waitlist, certificates | Phase 7 |
| Volunteers, gate scanner | Phase 7 |

## Your homework (still open)
- Answer the 4 questions in `Phase_0_Foundations/practice/README.md` (class vs object, List vs Queue …).
- Try the demo accounts in the browser (see which menu each role gets).

## How to start everything next time
1. Open **Docker Desktop** (Start menu) and wait for "Engine running" (MySQL + Mailpit). If needed: `docker compose up -d` in `02_EventHub_Practice_Project`.
2. Backend: open **IntelliJ yourself from the Start menu** → run `EventhubApplication` (or `mvnw.cmd spring-boot:run` in `backend`) → http://localhost:8080/api/health
3. Frontend: in `frontend` run `npm run dev` → http://localhost:5173
4. Tell Claude: "I am back, recall" (Claude reads this file first).

## Git
- Repo: https://github.com/madhavansuresh000-sys/eventhub (branch main, all pushed, CI green)
- Last commit: `653e437` Phase 5 step 7 (frontend)
- Backend tests: 74, all passing
