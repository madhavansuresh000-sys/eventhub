-- Phase 7 step 1: the smart waitlist (like the IRCTC waiting list: WL #1, WL #2, ...).
--
--  entry status:  WAITING ──a seat frees up──▶ OFFERED ──accept──▶ BOOKED (a normal booking is made)
--                    │                            ├──30 minutes, no answer──▶ EXPIRED (seats go to the next one)
--                    └──leave──▶ LEFT             └──leave──▶ LEFT            (seats go to the next one)
--
-- An OFFERED entry already took its seats from events.available_seats, so nobody else can grab them
-- while the student decides. The queue order is the id (first come, first served).

CREATE TABLE waitlist_entries (
    id               BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT       NOT NULL,
    event_id         BIGINT       NOT NULL,
    quantity         INT          NOT NULL,
    status           VARCHAR(20)  NOT NULL,
    offer_expires_at DATETIME(6),                     -- only while OFFERED
    booking_id       BIGINT,                          -- the booking made when the offer was accepted
    created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    offered_at       DATETIME(6),
    closed_at        DATETIME(6),                     -- when it became BOOKED / EXPIRED / LEFT
    version          INT          NOT NULL DEFAULT 0, -- optimistic locking (accept vs expiry job)
    -- 1 while the entry is still in the queue, NULL after; the UNIQUE key below then allows only
    -- ONE open entry per student per event (MySQL lets many rows share NULL in a unique key)
    open_flag        TINYINT      AS (IF(status IN ('WAITING', 'OFFERED'), 1, NULL)) VIRTUAL,
    CONSTRAINT ck_waitlist_status   CHECK (status IN ('WAITING', 'OFFERED', 'BOOKED', 'EXPIRED', 'LEFT')),
    CONSTRAINT ck_waitlist_quantity CHECK (quantity BETWEEN 1 AND 10),
    CONSTRAINT fk_waitlist_user    FOREIGN KEY (user_id)    REFERENCES users (id),
    CONSTRAINT fk_waitlist_event   FOREIGN KEY (event_id)   REFERENCES events (id),
    CONSTRAINT fk_waitlist_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
    CONSTRAINT uq_waitlist_one_open UNIQUE (user_id, event_id, open_flag),
    INDEX idx_waitlist_queue (event_id, status, id),       -- "who is next for this event?"
    INDEX idx_waitlist_offer (status, offer_expires_at)    -- the job looks for old offers
);
