# 7. Backend code explained

This chapter walks through the backend module by module. For each one you get: what it does, the most important real code, an explanation line by line, a worked example, and what could go wrong without it.

## 7.1 The application entry point

Every Spring Boot application starts from one class with a `main` method:

@code backend/src/main/java/com/eventhub/EventhubApplication.java :: public class EventhubApplication

`@SpringBootApplication` tells Spring to scan the package `com.eventhub` and everything below it, create a bean for every class marked `@Service`, `@RestController`, `@Component`, `@Configuration` or `@Repository`, and start the embedded web server.

## 7.2 Errors that make sense: GlobalExceptionHandler

When something goes wrong, the API always answers in the same shape: the standard **Problem Details** format (RFC 9457) with an extra `errors` map for field problems. The React app reads `detail` for the message and `errors` for the field messages.

| Situation | Exception | HTTP status |
|---|---|---|
| A field is invalid (`@Valid`) | MethodArgumentNotValidException | 400 Bad Request + errors map |
| Wrong input such as end before start | BadRequestException | 400 |
| Not logged in | (security) | 401 Unauthorized |
| Logged in but not allowed | AccessDeniedException | 403 Forbidden |
| The thing does not exist | ResourceNotFoundException | 404 Not Found |
| A business rule says no (sold out, not your turn) | BusinessRuleException | 409 Conflict |
| Two people changed the same row | ObjectOptimisticLockingFailureException | 409 |
| Too many wrong passwords | TooManyLoginAttemptsException | 429 + Retry-After |
| Anything unexpected | Exception | 500 (details only in the server log) |

@code backend/src/main/java/com/eventhub/common/GlobalExceptionHandler.java :: ProblemDetail handleBusinessRule

Example answer when Ravi tries to book a sold-out event:

```
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "Dance Night is sold out. You can join the waitlist.",
  "instance": "/api/bookings"
}
```

> A 500 error never shows the internal message to the user (it could reveal table names or code). The real exception is written to the server log instead.

## 7.3 Events: search, rules and the approval workflow

### The status state machine

The allowed moves are written once, in the enum itself. Every service method asks `canMoveTo` before changing the status, so an illegal move (for example DRAFT straight to PUBLISHED) is impossible.

@code backend/src/main/java/com/eventhub/event/EventStatus.java :: public enum EventStatus

>> Like a job application: "draft" → "submitted" → "accepted". You cannot jump from "draft" to "accepted", and once it is submitted you cannot secretly edit it; you can only get it back (rejected) and submit again.

![Event and booking states](states.png)

### Searching with Specifications

The search page can combine up to five filters (text, tag, club, from, to). Instead of writing 32 different queries, EventHub builds the WHERE clause from small pieces called **Specifications** and joins only the ones that were filled in:

@code backend/src/main/java/com/eventhub/event/EventSpecifications.java :: public static Specification<Event> publishedMatching

Example: `GET /api/events?q=robot&tag=robotics&page=0&size=9&sort=date` becomes, roughly:

```
SELECT ... FROM events e
WHERE e.status = 'PUBLISHED'
  AND (lower(e.title) LIKE '%robot%' OR lower(e.description) LIKE '%robot%')
  AND EXISTS (SELECT 1 FROM event_tags et JOIN tags t ... WHERE t.name = 'robotics')
ORDER BY e.start_time ASC
LIMIT 9 OFFSET 0
```

Visitors only ever see PUBLISHED events: the status filter is always added by the server, whatever the browser sends.

### Creating and updating an event

@code backend/src/main/java/com/eventhub/event/EventService.java :: public EventDetailResponse update

Line by line:

1. `findEvent(id)` loads the event or throws 404.
2. `checkTimes` refuses an end time before the start time (400).
3. An event waiting for approval cannot be changed (409) - the admin must see exactly what was submitted.
4. Seats cannot be reduced below the seats already sold. `booked = totalSeats - availableSeats`.
5. `applyRequest` copies the new values; `availableSeats` moves by the same amount as `totalSeats`.
6. If seats were added, `waitlist.offerFreeSeats` immediately offers them to the waitlist.
7. `audit.record` writes who changed it into the audit log, in the same transaction.

### Submit, approve, reject

@code backend/src/main/java/com/eventhub/event/EventService.java :: public EventDetailResponse approve

@code backend/src/main/java/com/eventhub/event/EventService.java :: private void moveTo

`eventsPublisher.publishEvent(new EventReviewed(...))` announces the decision inside the application. The notification module listens and creates "Your event was approved" (or "sent back") for the organizer - the event module does not need to know how notifications work.

## 7.4 Security: login, JWT cookie, CSRF and permissions

### Passwords

Passwords are hashed with **BCrypt** before they are saved. A hash cannot be turned back into the password; at login, BCrypt hashes the typed password again and compares. Each hash contains a random "salt", so two users with the same password still get different hashes.

@code backend/src/main/java/com/eventhub/auth/AuthService.java :: public User register

### The login token (JWT)

After a successful login the server creates a **JSON Web Token**: a small signed text with the user id, email, name and global roles, valid for 8 hours. It is signed with HMAC-SHA256 using `JWT_SECRET`, so nobody without the secret can create or change one.

@code backend/src/main/java/com/eventhub/auth/JwtService.java :: public String issue

The token travels in a cookie named `EVENTHUB_TOKEN` with three important flags: **HttpOnly** (JavaScript cannot read it), **SameSite=Lax** (other websites cannot make the browser send it with a form POST) and **Secure** in production (only over HTTPS).

On every request the `JwtCookieFilter` reads the cookie and, if the signature and expiry are fine, tells Spring Security who the user is:

@code backend/src/main/java/com/eventhub/auth/JwtCookieFilter.java :: protected void doFilterInternal

>> The JWT is like a college ID card with a hologram. The gatekeeper does not phone the office for every student; he checks the hologram (signature) and the expiry date. A card with a changed name has a broken hologram and is refused.

### The security rules

@code backend/src/main/java/com/eventhub/config/SecurityConfig.java :: SecurityFilterChain securityFilterChain

- **STATELESS**: the server keeps no session; every request carries its own proof (the cookie).
- **CSRF**: the server sets a cookie `XSRF-TOKEN` that JavaScript *can* read. Axios copies it into the header `X-XSRF-TOKEN`. Another website cannot read our cookie, so its forged POST has no valid header and gets 403.
- **URL rules**: public catalogue and login pages; `/api/admin/**`, Swagger and Actuator for ADMIN only; everything else needs login.

### Club-level permissions

Global roles (STUDENT, ADMIN) are in the token. Club roles (ORGANIZER, VOLUNTEER of a club) are **read from the database on every check**, so removing an organizer takes effect immediately.

@code backend/src/main/java/com/eventhub/auth/ClubAccess.java :: public boolean canManageEvent

Used on controller methods like this: `@PreAuthorize("@clubAccess.canManageEvent(#id)")`. Example: Kavya (Cultural Club organizer) may edit Dance Night (event 6, Cultural Club). If she calls `PUT /api/events/5` (Spring Boot Bootcamp, a Coding Club event), the answer is 403 Forbidden.

### Stopping password guessing

@code backend/src/main/java/com/eventhub/auth/LoginAttemptService.java :: public void failed

After the 5th wrong password for the same email **from the same address**, login is locked for 15 minutes (HTTP 429 with a `Retry-After` header), even with the right password. Locking by email alone would let anybody lock your account on purpose; locking by address alone would block a whole college Wi-Fi.

## 7.5 Bookings: holding seats without ever overselling

### The problem

Imagine one seat left and two students pressing "Book" at the same moment. Both requests read "1 seat left". Both subtract one and save "0 seats left". Two bookings, one seat. This is called a **race condition** or **lost update**.

### The solution: optimistic locking + retry

The `Event` entity has a `@Version` field. When Hibernate saves the event it runs:

```
UPDATE events SET available_seats = 0, version = 8 WHERE id = 2 AND version = 7
```

The first request changes one row. The second finds no row with version 7 (it is now 8), changes nothing, and Hibernate throws an optimistic-locking exception. The `Retry` helper catches it and runs the whole booking again **in a new transaction**, which reads the fresh value "0 seats left" and answers "sold out".

@code backend/src/main/java/com/eventhub/booking/Retry.java :: public static <T> T onConflict

@code backend/src/main/java/com/eventhub/booking/BookingService.java :: private Long holdOnce

Details worth noticing:

- `transactions.execute(...)` (TransactionTemplate) gives each attempt its own transaction.
- `events.saveAndFlush(event)` writes the seat change **before** inserting the booking. Always touching the event row first gives every booking the same lock order, which prevents a MySQL **deadlock** that appeared during testing.
- Free events are confirmed immediately; paid ones stay HELD for 10 minutes (`app.booking.hold-time`).

>> Optimistic locking is like editing a shared Google Sheet cell that shows "last edited version 7". If someone else saved first, your save is refused with "this changed - please reload", instead of silently overwriting their work.

### Proof: the concurrency test

`BookingConcurrencyTest` starts **100 threads** that all try to book one seat of an event with **10 seats**, at the same moment, three times in a row. The test checks that exactly 10 bookings succeed and the event shows 0 seats left. When `@Version` was removed as an experiment, the same test sold 96 to 99 tickets.

### Freeing unpaid holds

@code backend/src/main/java/com/eventhub/booking/BookingService.java :: public int expireOldHolds

`HoldExpiryJob` calls this method every 60 seconds (`@Scheduled`). Each expired hold is handled in its own transaction, so one failure does not stop the others; the freed seats are offered to the waitlist.

### Cancelling

@code backend/src/main/java/com/eventhub/booking/BookingService.java :: public BookingResponse cancel

A ticket that was already scanned at the gate cannot be cancelled (otherwise someone could enter and then ask for a refund).

## 7.6 Payments: one interface, two gateways

The booking code never talks to Stripe directly. It talks to an **interface**:

@code backend/src/main/java/com/eventhub/payment/PaymentGateway.java :: public interface PaymentGateway

`PaymentConfig` chooses the implementation when the application starts: `StripePaymentGateway` if `STRIPE_SECRET_KEY` is set, otherwise `FakePaymentGateway`, which sends the student to EventHub's own test page. In production the fake gateway is refused.

>> A phone charger with a standard plug: the phone (booking code) works with any charger (Stripe, test page) that fits the socket (interface).

### The Stripe webhook (and why it must be idempotent)

After a student pays on Stripe's page, **Stripe's server** calls EventHub (`POST /api/payments/stripe/webhook`). This endpoint has no login, so the message is proven by its **signature**:

@code backend/src/main/java/com/eventhub/payment/PaymentController.java :: public ResponseEntity<String> stripeWebhook

Stripe may send the same message more than once. `markPaid` first inserts the message id into `processed_payment_events` (primary key). A second insert of the same id fails with a duplicate key, and the message is ignored: **the same notice never confirms twice** (this is called idempotency).

@code backend/src/main/java/com/eventhub/booking/BookingService.java :: private PaidResult markPaidOnce

Late payments: if the money arrives after the 10-minute hold expired, the code tries to take the seats again; if they are gone, the payment is **refunded** automatically.

### Verify on return

If the webhook is slow (or the Stripe CLI is not running on a laptop), the success page calls `POST /api/payments/{session}/verify`, which asks Stripe directly "is this session paid?" and runs the same `markPaid` code.

## 7.7 The smart waitlist

When an event is sold out, students can join its waitlist. When seats become free (a cancellation, an expired hold, or the organizer adds seats), they are **offered** to the first students in the queue and kept for them for 30 minutes.

@code backend/src/main/java/com/eventhub/waitlist/WaitlistOffers.java :: public int offerFreeSeats

Rules visible in the code:

- The queue is served in order of joining (`id` ascending).
- A group that does not fit (Ravi wants 3, only 2 are free) **keeps its place**; smaller requests behind it may be served meanwhile.
- `offerFreeSeats` runs **inside the same transaction** that freed the seats, so seats are never free and un-offered at the same time.
- It publishes `SeatOffered`, which triggers the email and the bell notification.

`WaitlistOfferJob` runs every 60 seconds: offers older than 30 minutes expire and the seats move to the next student.

## 7.8 Notifications: bell, email and reminders

The notification module **listens** to events from other modules (`SeatOffered`, `BookingConfirmed`, `EventReviewed`):

@code backend/src/main/java/com/eventhub/notification/NotificationTriggers.java :: public void seatOffered

The email is sent **after the transaction commits**:

@code backend/src/main/java/com/eventhub/notification/EmailSender.java :: public void afterCommit

Why after commit? If the email were sent inside the transaction and the transaction then rolled back (for example because of a conflict), the student would get "A seat is waiting for you" for a seat that does not exist. This pattern - save the message with the change, deliver it after the commit - is a simple form of the **outbox pattern**.

If the mail server is down, the notification stays PENDING and `NotificationJobs.emailRetry` tries again every minute, at most 5 times (then FAILED). The bell in the app shows the notification anyway.

Reminders: every day at 18:00 (India time) `ReminderService.remindForDayAfter` sends "See you tomorrow" to everyone with a confirmed ticket for tomorrow's events, once per booking (`reminder_sent_at`).

## 7.9 The gate: QR codes and check-in

### Drawing the QR code

@code backend/src/main/java/com/eventhub/gate/QrCodeService.java :: public byte[] png

The QR code contains **only** the random ticket code (for example EVH-97Z38-F9Y5Q), not the name or the event - nothing private is printed on the ticket.

### One scan, one entry

The heart of the gate is one SQL statement that checks and marks in a single step:

@lines backend/src/main/java/com/eventhub/booking/BookingRepository.java :: 40 :: 48

@code backend/src/main/java/com/eventhub/gate/CheckInService.java :: public CheckInResponse checkIn

How to read the result:

- `markCheckedIn` returns **1** (one row changed): this scan won → VALID, "Let in".
- It returns **0**: the ticket was already used → ALREADY USED, with the time and the volunteer name.
- The code does not exist, is for another event, or was cancelled → INVALID.

>> Like a library book with one stamp box: the librarian stamps it only if the box is empty. Two librarians cannot both stamp it - the second sees the box is already filled.

A subtle bug found during testing: MySQL's default isolation (REPEATABLE READ) keeps showing a transaction the data as it was when it started. The gate that lost the race re-read the ticket and still saw "not used". The fix: decide from the UPDATE's result instead of reading again. `GateConcurrencyTest` has 20 gates scan the same ticket at once and expects exactly one VALID.

## 7.10 Certificates

Certificates are created **lazily**: when a student opens "My certificates", the server looks for their bookings that were checked in and whose event has ended, and creates any missing certificates.

@code backend/src/main/java/com/eventhub/certificate/CertificateService.java :: public List<CertificateResponse> mine

@code backend/src/main/java/com/eventhub/certificate/CertificateService.java :: private static String newNumber

- The number is random (EH-2026 + 8 characters without look-alike letters), so nobody can walk through numbers 1, 2, 3 and collect names.
- `certificates.booking_id` is UNIQUE: even two clicks at the same moment create only one certificate.
- The PDF is drawn by `CertificatePdf` with OpenPDF: name, event, club, date, venue, number and a QR code that opens the public verify page.
- `GET /api/certificates/verify/{number}` is public: it answers only with the name, event, club and date - no email or other private data.

## 7.11 Feedback

@code backend/src/main/java/com/eventhub/feedback/FeedbackService.java :: public MyFeedbackResponse give

- Only the ticket's owner, only if scanned at the gate, only after the event ended.
- `PUT` means "set it to this": sending the same rating twice gives the same result, and a student can change their mind.
- Organizers see average, star counts and comments **without names**, so students can be honest.

A small real problem: the database column is `TINYINT`, the Java field `int`. With `ddl-auto: validate`, Hibernate refused to start ("wrong column type"). The fix was one annotation: `@JdbcTypeCode(SqlTypes.TINYINT)`.

## 7.12 Analytics with caching

The database does the counting with JPQL aggregates (`SUM`, `COUNT`, `AVG`, `GROUP BY`), so Java receives a few small rows instead of every booking:

@lines backend/src/main/java/com/eventhub/analytics/AnalyticsQueries.java :: 36 :: 55

@code backend/src/main/java/com/eventhub/analytics/AnalyticsService.java :: public AnalyticsResponse dashboard

- `@Cacheable(cacheNames = "analytics", key = "(#clubId ?: 'all') + ':' + #days")` stores the answer per club and period in a Caffeine cache for 60 seconds (`spring.cache.caffeine.spec: expireAfterWrite=60s`).
- `everyDay` fills days without sales with 0, so the chart has no gaps.
- The check-in rate uses only events that have already started (for a future event nobody could come yet).
- The average rating is **weighted**: an event rated by 10 people counts more than one rated by 1.

>> Caching is like a shop's daily sales board: the manager writes the totals once every few minutes instead of counting every receipt each time someone asks.

## 7.13 The audit log

@code backend/src/main/java/com/eventhub/audit/AuditService.java :: public void record

It is called inside the same transaction as the change, so a change and its audit row are saved together or not at all. The user's name and email are copied into the row, so the history stays readable even if the account is later deleted.
