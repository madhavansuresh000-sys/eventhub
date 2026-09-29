-- Phase 7 step 2: notifications = the bell in the app + (optionally) an email.
--
-- "Outbox" idea: the notification row is saved in the SAME transaction as the change it talks about
-- (seat offered, booking confirmed, ...). If that change is rolled back, the row disappears too,
-- so we never email about something that did not happen. The email is sent after the commit;
-- if the mail server is down, email_status stays PENDING and a job tries again every minute.

CREATE TABLE notifications (
    id             BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT        NOT NULL,
    kind           VARCHAR(30)   NOT NULL,
    title          VARCHAR(200)  NOT NULL,
    body           VARCHAR(1000) NOT NULL,
    link           VARCHAR(300),                       -- page in the React app, e.g. /waitlist
    created_at     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    read_at        DATETIME(6),                        -- NULL = unread (counts on the bell)
    email_status   VARCHAR(10)   NOT NULL,             -- NONE (bell only), PENDING, SENT, FAILED
    email_attempts INT           NOT NULL DEFAULT 0,
    emailed_at     DATETIME(6),
    CONSTRAINT ck_notifications_kind  CHECK (kind IN ('SEAT_OFFERED', 'BOOKING_CONFIRMED', 'EVENT_REMINDER',
                                                      'EVENT_APPROVED', 'EVENT_SENT_BACK')),
    CONSTRAINT ck_notifications_email CHECK (email_status IN ('NONE', 'PENDING', 'SENT', 'FAILED')),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id),
    INDEX idx_notifications_user (user_id, created_at),   -- the bell: my newest first
    INDEX idx_notifications_email (email_status, id)       -- the retry job
);

-- The day-before reminder is sent once per booking.
ALTER TABLE bookings ADD COLUMN reminder_sent_at DATETIME(6);
