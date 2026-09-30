# Session Summary: 28 September 2026 (evening, about 18:36–19:59)

## Big picture
```
Phase:  0    1    2    3    4    5    6    7    8    9
        ✅   ✅   ✅   ✅   ✅   ✅   🟢   ⬜   ⬜   ⬜
                                     ▲ Phase 6 built · 1 check left (Stripe card 4242)
EventHub ≈ 75% done  ·  then TriVoKo (main e-commerce project) ⬜
```

| Phase | Status |
|---|---|
| 0 Foundations · 1 Setup · 2 Backend · 3 Frontend · 4 Connecting · 5 Security | ✅ Complete (approved) |
| **6 Booking and payments** | 🟢 **Built and tested. Waiting for the Stripe 4242 check, then your approval** |
| 7 Signature features (smart waitlist, QR check-in, PDF certificates) | ⬜ Next |
| 8 Testing and polish · 9 Launch | ⬜ |

## What we did this session
1. Saved the afternoon session (Session_Summary_2026-09-28_1832).
2. **Built Phase 6** (all 11 steps):
   - Tables: `bookings`, `payments`, `processed_payment_events` (Flyway V4).
   - Booking engine: hold seats for 10 minutes → pay → CONFIRMED; free events confirmed at once; cancel gives seats back; an every-minute job expires unpaid holds.
   - No overselling: optimistic locking (`@Version`) + automatic retry.
   - Payments behind a switch: **Stripe Checkout** (when `STRIPE_SECRET_KEY` is in `.env`) or the **built-in test payment page** (dev only).
   - Stripe webhook with signature check; idempotency (the same message twice changes nothing); late payments are re-confirmed or refunded.
   - React: Book button, Checkout with the server's timer, test payment page, payment success/cancelled pages, My tickets and QR ticket from the real database.
3. **Showed EventHub working live in a real Edge window** (script `tools/edge-demo.mjs`, separate Edge profile, yellow captions for each step).

## How booking works (diagram)
```
 Student               EventHub backend                              Payment
   │ Book 2 seats ──▶ ① HOLD: seats 40→38, booking HELD, 10-min timer
   │ Pay ₹200     ──▶ ② open checkout session ───────────────────▶ Stripe page / test page
   │ ◀────────────────────────── back to EventHub after paying ◀──┘
   │                  ③ webhook (signed) or verify → CONFIRMED (only once)
   │                  ④ every minute: unpaid holds > 10 min → EXPIRED, seats back

 Two students, last seat, same moment:
   Ravi : read 1 left (version 7) → save 0 left WHERE version = 7  ✅ wins
   Priya: read 1 left (version 7) → save ... WHERE version = 7     ❌ 0 rows → retry → "sold out"
```

## Proof
| Check | Result |
|---|---|
| 100 students, 10 seats, pressing Book together | **exactly 10 bookings**, 3 runs out of 3 ✅ |
| Same test with `@Version` removed (mutation check) | **96–99 bookings** for 10 seats ❌, so the test really catches overselling |
| Unpaid hold expires and seats return | ✅ (test) |
| Same payment message twice | confirmed once only ✅ (test) |
| Fake or changed Stripe signature | rejected with 400 ✅ (test) |
| Live demo in Edge | Tech Fest 40 → 38 seats, QR ticket `EVH-KAG94-WRCZP` ✅ |
| Backend tests | **90, all passing** |
| GitHub CI | **#27, #28, #29 green** |

## Your to-do before the next session
1. **Stripe test key** (for the last Phase 6 check):
   - Create a free account at dashboard.stripe.com and stay in **Test mode**.
   - Developers → API keys → copy the **Secret key** (`sk_test_…`).
   - Put it in `02_EventHub_Practice_Project\.env` as `STRIPE_SECRET_KEY=sk_test_…`.
   - Then Claude restarts the backend and we pay with card **4242 4242 4242 4242**.
2. Homework still open: the 4 questions in `Phase_0_Foundations/practice/README.md`.
3. Optional: rerun the Edge demo: `node tools/edge-demo.mjs demo-shots` (first cancel Ravi's two bookings in My tickets).

## Demo accounts (laptop only)
admin@ / madhavan@ (Coding organizer) / kavya@ (Cultural organizer) / priya@ (Coding volunteer) / ravi@ (student) **@eventhub.test**.
Password = `DEMO_PASSWORD` in `.env` (not written here on purpose).
Ravi now has 2 confirmed bookings (Tech Fest ×2, Intro to Git ×1) from the demo.

## Still sample data (becomes real in Phase 7)
Waitlist · certificates · volunteers · gate scanner.

## How to start everything next time
1. Open **Docker Desktop** from the Start menu and wait for "Engine running". Then in `02_EventHub_Practice_Project`: `docker compose up -d` (MySQL + Mailpit).
2. Backend: open **IntelliJ yourself** → run `EventhubApplication` (or `mvnw.cmd spring-boot:run` in `backend`) → http://localhost:8080/api/health
3. Frontend: in `frontend` run `npm run dev` → http://localhost:5173
4. Tell Claude: **"I am back, recall"**. Claude reads this file first.

## Git
- https://github.com/madhavansuresh000-sys/eventhub (main): everything pushed, CI green.
- Last commit: `b8cb5ac` (tools: Edge demo script).
