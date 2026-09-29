-- Phase 7 steps 3-4: the gate. A confirmed booking is "used" once its QR code is scanned.
-- checked_in_at is set by ONE conditional UPDATE ("... WHERE checked_in_at IS NULL"), so if two volunteers
-- scan the same ticket at the same moment, only one of them gets VALID - the other gets ALREADY USED.

ALTER TABLE bookings
    ADD COLUMN checked_in_at DATETIME(6),
    ADD COLUMN checked_in_by BIGINT,
    ADD CONSTRAINT fk_bookings_checked_in_by FOREIGN KEY (checked_in_by) REFERENCES users (id),
    ADD INDEX idx_bookings_event_status (event_id, status);   -- the live counter of one event
