# 6. Database design

## 6.1 Overview

EventHub stores its data in **17 MySQL tables**. They are never created or changed by hand: every change is a numbered SQL file (a **migration**) in `backend/src/main/resources/db/migration`, run automatically by Flyway when the backend starts.

| Migration | Phase | What it adds |
|---|---|---|
| V1__create_core_tables.sql | 2 | roles, users, user_roles, profiles, clubs, club_members, events, tags, event_tags |
| V2__seed_sample_data.sql | 2 | 5 clubs, 10 tags, 20 sample events |
| V3__create_audit_log.sql | 5 | audit_log |
| V4__create_bookings_and_payments.sql | 6 | bookings, payments, processed_payment_events |
| V5__create_waitlist.sql | 7 | waitlist_entries |
| V6__create_notifications.sql | 7 | notifications, bookings.reminder_sent_at |
| V7__add_check_in.sql | 7 | bookings.checked_in_at / checked_in_by |
| V8__create_certificates.sql | 7 | certificates |
| V9__create_feedback.sql | 7 | feedback |

![The main tables and how they are linked](er-diagram.png)

>> A migration is like a numbered page in a building's renovation log: "1 - build the walls, 2 - add furniture, 3 - add a security camera". Any new building (a laptop, the test database, the server) follows the same pages in the same order and ends up identical.

## 6.2 Rules that protect the data

The database itself refuses wrong data, even if a bug in Java tried to save it:

- **Primary keys** (`id BIGINT AUTO_INCREMENT`) identify every row.
- **Foreign keys** link rows: a booking must point to an existing user and event.
- **UNIQUE** keys stop duplicates: one email per user, one ticket code per booking, one certificate and one rating per booking, one processed webhook message per id.
- **CHECK** constraints limit values: booking status must be HELD, CONFIRMED, CANCELLED or EXPIRED; quantity 1-10; rating 1-5.
- **NOT NULL** columns must always have a value.
- **Indexes** make the frequent searches fast, for example `idx_bookings_hold (status, hold_expires_at)` for the job that frees old holds.

> Status columns are `VARCHAR` + `CHECK` instead of MySQL `ENUM`. Adding a new status then only needs a new CHECK, and the values read naturally in Java (`@Enumerated(EnumType.STRING)`).

## 6.3 Optimistic locking columns

`events.version` and `bookings.version` are **version numbers**. Hibernate adds `WHERE version = ?` to every UPDATE and increases the number. If two transactions read the same row and both try to save, the second UPDATE finds no row with the old version and fails - so the second one must read again and retry. Chapter 7 shows the code.

## 6.4 Every table, column by column

The tables below are generated automatically from the migration files, so they always match the real database. The "Meaning / rule" column shows the comment written next to each column in the SQL file, plus the rules (required, unique, default).

@tables

## 6.5 Useful SQL queries (with examples)

You can run these in MySQL Workbench, IntelliJ's database tool, or `docker exec -it eventhub-mysql mysql -u eventhub -p eventhub`.

**Which events are almost full?**

```
SELECT id, title, total_seats, available_seats,
       ROUND(100 * (total_seats - available_seats) / total_seats) AS percent_full
FROM events
WHERE status = 'PUBLISHED' AND start_time > NOW()
ORDER BY percent_full DESC
LIMIT 5;
```

**Ravi's tickets with the event name**

```
SELECT b.id, e.title, b.quantity, b.status, b.ticket_code, b.checked_in_at
FROM bookings b
JOIN events e ON e.id = b.event_id
JOIN users u ON u.id = b.user_id
WHERE u.email = 'ravi@eventhub.test'
ORDER BY b.created_at DESC;
```

**Check-in rate per event (the same idea as the analytics dashboard)**

```
SELECT e.title,
       SUM(b.quantity) AS sold,
       SUM(CASE WHEN b.checked_in_at IS NOT NULL THEN b.quantity ELSE 0 END) AS came
FROM events e
JOIN bookings b ON b.event_id = e.id AND b.status = 'CONFIRMED'
GROUP BY e.id, e.title;
```

**Who is on the waitlist of an event, in order**

```
SELECT w.id, u.full_name, w.quantity, w.status, w.offer_expires_at
FROM waitlist_entries w
JOIN users u ON u.id = w.user_id
WHERE w.event_id = 16
ORDER BY w.id;
```

**The audit trail of one event**

```
SELECT created_at, action, user_email, event_title, details
FROM audit_log
WHERE event_id = 35
ORDER BY created_at;
```

**Which Flyway migrations ran**

```
SELECT version, description, installed_on, success FROM flyway_schema_history;
```

## 6.6 How Java classes map to tables (JPA)

An **entity** is a Java class that stands for one table; each field stands for one column. Here is the `Event` entity (shortened by the generator to its fields):

@code backend/src/main/java/com/eventhub/event/Event.java :: public class Event :: 80

Points to notice:

- `@ManyToOne(fetch = FetchType.LAZY)` - an event belongs to one club, but the club is only loaded from the database when the code actually uses it. This avoids loading data nobody needs.
- `@ManyToMany` + `@JoinTable(name = "event_tags")` - the link table between events and tags.
- `@Version` - the optimistic-locking column described in 6.3.
- `@Enumerated(EnumType.STRING)` - the status is stored as text ('PUBLISHED'), not as a number.
- `@BatchSize(size = 50)` - when a page shows 12 events, their tags are loaded in one extra query instead of 12 (this avoids the "N+1 queries" problem).

## 6.7 Example: what the tables look like after one booking

Ravi books 1 ticket for the 24-Hour Hackathon (event 2, ₹150) and pays.

| Table | Row after the booking |
|---|---|
| events | id 2 · available_seats 10 → 9 · version +1 |
| bookings | new row · status HELD → CONFIRMED · amount 150.00 · ticket_code EVH-97Z38-F9Y5Q · hold_expires_at now+10 min · confirmed_at set |
| payments | new row · provider FAKE (or STRIPE) · session_id fake_cs_... · status PENDING → PAID |
| processed_payment_events | new row with the payment notice id (so the same notice is never processed twice) |
| notifications | new row "Booking confirmed" for Ravi · email PENDING → SENT |

After Priya scans the ticket at the gate: `bookings.checked_in_at` and `checked_in_by` are filled. After the event, when Ravi opens his certificates page, a row is added to `certificates` with a random number like EH-2026-BEQR4Y79.
