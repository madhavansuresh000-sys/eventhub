-- Phase 6: bookings (who holds / owns which seats) and payments (money for a booking).
--
--  booking status:  HELD ──paid / free──▶ CONFIRMED ──cancel──▶ CANCELLED
--                     │
--                     └──10 minutes, not paid──▶ EXPIRED   (seats go back to the event)
--
-- events.available_seats stays the single counter of free seats; a HELD booking already took its seats.

CREATE TABLE bookings (
    id              BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT        NOT NULL,
    event_id        BIGINT        NOT NULL,
    quantity        INT           NOT NULL,
    status          VARCHAR(20)   NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,              -- price x quantity when booked (the price may change later)
    ticket_code     VARCHAR(40)   NOT NULL UNIQUE,       -- goes into the QR code (Phase 7 gate scan)
    hold_expires_at DATETIME(6),                         -- only for HELD bookings
    created_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    confirmed_at    DATETIME(6),
    cancelled_at    DATETIME(6),
    version         INT           NOT NULL DEFAULT 0,    -- optimistic locking (webhook vs expiry job)
    CONSTRAINT ck_bookings_status   CHECK (status IN ('HELD', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
    CONSTRAINT ck_bookings_quantity CHECK (quantity BETWEEN 1 AND 10),
    CONSTRAINT fk_bookings_user  FOREIGN KEY (user_id)  REFERENCES users (id),
    CONSTRAINT fk_bookings_event FOREIGN KEY (event_id) REFERENCES events (id),
    INDEX idx_bookings_user (user_id, created_at),
    INDEX idx_bookings_hold (status, hold_expires_at)     -- the expiry job looks for old HELD bookings
);

CREATE TABLE payments (
    id           BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    booking_id   BIGINT        NOT NULL,
    provider     VARCHAR(20)   NOT NULL,                 -- STRIPE, or FAKE (dev test page)
    session_id   VARCHAR(255)  NOT NULL UNIQUE,          -- the payment provider's checkout session id
    status       VARCHAR(20)   NOT NULL,
    amount       DECIMAL(10,2) NOT NULL,
    currency     VARCHAR(3)    NOT NULL,
    created_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    paid_at      DATETIME(6),
    refunded_at  DATETIME(6),
    CONSTRAINT ck_payments_status   CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'REFUNDED')),
    CONSTRAINT ck_payments_provider CHECK (provider IN ('STRIPE', 'FAKE')),
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
    INDEX idx_payments_booking (booking_id)
);

-- Idempotency: every payment notification (webhook) id is written here ONCE.
-- The PRIMARY KEY makes a second insert of the same id fail, so the same message twice never confirms twice.
CREATE TABLE processed_payment_events (
    event_id    VARCHAR(255) NOT NULL PRIMARY KEY,
    received_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);
