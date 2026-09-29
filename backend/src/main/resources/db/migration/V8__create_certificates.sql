-- Phase 7 step 5: certificates of participation.
-- Only for a booking that was SCANNED AT THE GATE (bookings.checked_in_at) of an event that has ENDED.
-- booking_id is UNIQUE: one certificate per ticket, however often the student opens the page.
-- number is random (not 1, 2, 3 ...), so nobody can walk through all certificates on the public verify page.
-- holder_name is copied at issue time: the certificate keeps the name it was issued to.

CREATE TABLE certificates (
    id           BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    number       VARCHAR(30)   NOT NULL UNIQUE,
    booking_id   BIGINT        NOT NULL UNIQUE,
    user_id      BIGINT        NOT NULL,
    event_id     BIGINT        NOT NULL,
    holder_name  VARCHAR(100)  NOT NULL,
    issued_at    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_certificates_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
    CONSTRAINT fk_certificates_user    FOREIGN KEY (user_id)    REFERENCES users (id),
    CONSTRAINT fk_certificates_event   FOREIGN KEY (event_id)   REFERENCES events (id),
    INDEX idx_certificates_user (user_id, issued_at)
);
