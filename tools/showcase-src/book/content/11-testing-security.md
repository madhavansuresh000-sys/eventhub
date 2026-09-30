# 11. Testing

## 11.1 Why test automatically?

Every time the code changes, something that used to work can break. Clicking through 29 pages by hand after every change is slow and people forget steps. Automated tests are small programs that use the application and check the answers - in about two minutes, every time, on every push.

>> Automated tests are like the quality-control machine at a biscuit factory: every biscuit is weighed automatically; a person only looks when the machine rings the bell.

## 11.2 The testing pyramid

![The testing pyramid used in EventHub](test-pyramid.png)

| Level | What it checks | Speed | EventHub examples |
|---|---|---|---|
| Unit test | One class alone; everything around it is replaced by mocks | milliseconds | `StripePaymentGatewayTest`, `RetryTest`, `AnalyticsServiceTest`, `EventStatusTest` |
| Integration test | Several layers together, with a real database | seconds | `BookingFlowTest`, `GateFlowTest`, `SecurityRulesTest`, `WaitlistFlowTest` |
| Concurrency test | Many threads at the same moment | seconds | `BookingConcurrencyTest` (100 threads), `GateConcurrencyTest` (20 gates) |
| Component test (React) | One page or component in a fake browser | milliseconds | `LoginPage.test.jsx`, `ScannerPage.test.jsx`, `useCountdown.test.jsx` |
| End-to-end demo | The whole running system in a real browser | minutes | `tools/edge-tour.mjs` (28 steps) |

## 11.3 The numbers

| Measure | Value |
|---|---|
| Backend tests | 133 (26 test classes) |
| Frontend tests | 13 (4 test files) |
| Line coverage of the service classes | 91% |
| Line coverage of the whole backend | 92% |
| Time for all backend tests | about 2 minutes (including starting MySQL) |
| CI | GitHub Actions, on every push, green |

## 11.4 Unit tests with Mockito

A **mock** is a fake object that answers what the test tells it to. It lets us test the maths of `AnalyticsService` without a database: the test decides what the "database" returns and checks what the service calculates.

@code backend/src/test/java/com/eventhub/analytics/AnalyticsServiceTest.java :: void checkInRateCountsOnlyStartedEventsAndStarsAreWeightedByHowManyRated

Line by line:

1. `@Mock AnalyticsQueries queries` - a fake repository.
2. `when(queries.salesPerEvent(any(), any())).thenReturn(...)` - "if the service asks for sales per event, give it these three rows".
3. `service.dashboard(null, 30)` - run the real code.
4. `assertThat(...).isEqualTo(0.8)` - (30 + 10) people came out of (40 + 10) tickets for the started events = 80%. The future event is correctly left out.
5. The weighted average: (4 + 4 + 4 + 2) / 4 ratings = 3.5, not (4.0 + 2.0) / 2 events = 3.0.

The Stripe gateway was never run against real Stripe in this project, so its unit test is especially valuable. Mockito's `mockStatic` replaces Stripe's static methods for one test and captures exactly what EventHub would send:

@code backend/src/test/java/com/eventhub/payment/StripePaymentGatewayTest.java :: void checkoutAsksStripeForTheRightAmountInPaiseAndTheRightReturnPages

## 11.5 Integration tests with Testcontainers

Integration tests start the whole Spring application and call it through **MockMvc**, exactly like the browser would, including the login cookie and the CSRF header. They need a real MySQL - an in-memory database behaves differently (locks, isolation, SQL details).

**Testcontainers** starts a brand-new MySQL 8.4 container in Docker once per test run and removes it at the end:

@code backend/src/test/java/com/eventhub/MySqlTestDatabase.java :: public class MySqlTestDatabase

It is registered in `src/test/resources/META-INF/spring.factories`, so every test class uses it automatically. Most integration tests are `@Transactional`: each test's changes are rolled back at the end, so tests never disturb each other.

Example of an integration test - the security rule "Swagger and Actuator are for the admin only":

@code backend/src/test/java/com/eventhub/auth/SecurityRulesTest.java :: void swaggerAndActuatorAreForTheAdminOnly

## 11.6 Concurrency tests

@code backend/src/test/java/com/eventhub/booking/BookingConcurrencyTest.java :: void hundredStudentsTenSeatsExactlyTenBookings :: 60

- 100 threads wait at a `CountDownLatch` and are released at the same moment.
- The test is **not** `@Transactional` (each thread needs its own real transaction) and cleans up after itself.
- `@RepeatedTest(3)` runs it three times, because concurrency bugs do not always show up on the first try.
- **Mutation check**: when `@Version` was removed from `Event` on purpose, this test failed with 96-99 bookings. A test that can fail is a test that proves something.

## 11.7 React component tests

Vitest runs the tests in **jsdom**, a fake browser. React Testing Library finds elements the way a user would (by label, role or text) and `user-event` types and clicks like a person.

@code frontend/src/pages/LoginPage.test.jsx :: it('after login goes back to the page in ?next=

The API module is replaced by a mock (`vi.mock('../api/auth', ...)`), so the test controls the server's answer.

`useCountdown.test.jsx` uses **fake timers**: the test moves the clock by 65 seconds instantly and checks that "10:00" became "08:55".

## 11.8 Continuous integration (GitHub Actions)

@lines .github/workflows/ci.yml :: 1 :: 48

Every push to GitHub starts two jobs on fresh Ubuntu machines: the backend (Java 25, `mvnw verify` - all tests with Testcontainers - and the JaCoCo report as a downloadable artifact) and the frontend (Node 24: `npm ci`, lint, test, build). The green or red result appears next to each commit.

## 11.9 Bugs the tests found

| Bug | Found by | Fix |
|---|---|---|
| Two bookings for the last seat | BookingConcurrencyTest | `@Version` + retry |
| MySQL deadlock between two bookings | BookingConcurrencyTest | update the event row before inserting the booking |
| A second gate re-read the ticket and still saw it unused | GateConcurrencyTest | decide from the UPDATE result |
| CSRF token changed on every request (second parallel request failed) | browser test | keep one token (`sessionAuthenticationStrategy`) |
| Jackson 3 refused a missing number | ErrorHandlingTest | `Integer` + `@NotNull` instead of `int` |
| Hibernate refused TINYINT | start-up validation | `@JdbcTypeCode(SqlTypes.TINYINT)` |
| JWT test failed 1 run in 16 | CI | change the first signature letter, not the last (base64 padding bits) |
| Scanner page went blank after the first scan | Edge demo tour | import the moved colour table; new ScannerPage test; lint rule `no-undef` |

## 11.10 How to run the tests

```
cd backend
mvnw test                                  all backend tests
mvnw test -Dtest=BookingConcurrencyTest    one test class
start target\site\jacoco\index.html        open the coverage report

cd frontend
npm test                                   all React tests once
npm run test:watch                         re-run on every save
```

# 12. Security in depth

## 12.1 The main threats and the answers

| Threat | What an attacker tries | EventHub's defence |
|---|---|---|
| Stolen password database | read passwords from a leaked copy | BCrypt hashes with salt; passwords never stored or logged |
| Password guessing | try thousands of passwords | 5 failures per email + address → 15-minute lock (429) |
| Stolen login token (XSS) | a script on the page reads the token | JWT in an **httpOnly** cookie - scripts cannot read it |
| Forged request (CSRF) | another website makes your browser post to EventHub | SameSite=Lax cookie + CSRF token header that other sites cannot read |
| Doing other people's work | an organizer edits another club's event; a student opens admin URLs | role and club checks on **every** request (`SecurityConfig`, `@PreAuthorize`, `ClubAccess`) → 403 |
| Guessing ids | walk through /tickets/1, /2, /3 … | ownership checks (404 for other people's bookings); random ticket and certificate codes |
| Fake payment notification | call the webhook pretending to be Stripe | Stripe-Signature (HMAC with the webhook secret) checked first |
| Replayed payment notification | send the same "paid" message again | idempotency table `processed_payment_events` |
| Fake ticket at the gate | a screenshot or a made-up code | server-side check; each code works once; codes are random |
| Fake certificate | edit a PDF | public verify page shows the truth for each number |
| Leaking secrets | passwords in GitHub | `.env` in `.gitignore`; history scanned; only placeholders in `.env.example` |
| Learning the system | reading the API map and server details | Swagger and Actuator admin-only; 500 errors hide internal messages |
| Open redirect | `/login?next=https://evil.com` | `safeNext` only allows paths on this site |

## 12.2 Authentication vs authorization

- **Authentication** = *who are you?* - proven by the password once, then by the signed JWT cookie on every request.
- **Authorization** = *what may you do?* - global roles (STUDENT, ADMIN) from the token; club roles (ORGANIZER, VOLUNTEER) from the database.

>> Authentication is showing your ID card at the college gate. Authorization is whether that ID card opens the chemistry lab.

## 12.3 Why the JWT is in a cookie

| | localStorage + Authorization header | httpOnly cookie (EventHub) |
|---|---|---|
| Can a malicious script read it? | Yes | No |
| Sent automatically? | No (code must add it) | Yes (so CSRF protection is needed) |
| Needs CSRF protection? | No | Yes - done with the XSRF token |

EventHub chose the cookie because stealing a token is worse than a forged request that CSRF protection already blocks.

## 12.4 The login lock in action

1. Ravi's password is typed wrongly 4 times from one laptop - each answer: 401 "Wrong email or password."
2. The 5th wrong try locks the pair (ravi@eventhub.test, that laptop's address) for 15 minutes.
3. Even the right password now gets 429 "Too many wrong passwords. Please wait 15 minutes and try again." with a `Retry-After` header (seconds to wait).
4. Ravi can still log in from his phone on another network, and other students on the same Wi-Fi are not affected.
5. A successful login resets the counter.

## 12.5 Security checklist (Phase 8)

- Swagger UI, `/v3/api-docs` and Actuator (except `/actuator/health`) require ADMIN - tested by `SecurityRulesTest`.
- `/actuator/health` shows only UP/DOWN to visitors; database and disk details only to the admin.
- A scan of the code **and the whole git history** found no secrets; `.env` was never committed.
- The JWT secret must be at least 32 characters, and in production there is no default: the application refuses to start without it.
- Production refuses the fake payment gateway.
- Cookies are `Secure` in production (HTTPS only).
