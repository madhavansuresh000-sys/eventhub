-- Phase 7 step 6: feedback after the event - 1 to 5 stars and an optional comment.
-- Only from students who were scanned at the gate (checked in), after the event ended.
-- One per ticket (booking_id UNIQUE); the student may change it later (updated_at).
-- Organizers see ratings and comments WITHOUT names, so students can be honest.

CREATE TABLE feedback (
    id          BIGINT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    booking_id  BIGINT         NOT NULL UNIQUE,
    event_id    BIGINT         NOT NULL,
    user_id     BIGINT         NOT NULL,
    rating      TINYINT        NOT NULL,
    comment     VARCHAR(1000),
    created_at  DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at  DATETIME(6),
    CONSTRAINT ck_feedback_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_feedback_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
    CONSTRAINT fk_feedback_event   FOREIGN KEY (event_id)   REFERENCES events (id),
    CONSTRAINT fk_feedback_user    FOREIGN KEY (user_id)    REFERENCES users (id),
    INDEX idx_feedback_event (event_id, created_at)   -- the organizer's page and the average per event
);
