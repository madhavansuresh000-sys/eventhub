-- Phase 5 step 8: who created, edited, submitted, approved or rejected which event, and when.
-- Rows are only ever added (never changed), like a register at the college office.
-- Name, email and title are copied in, so the log still reads correctly if the user or event is deleted later.
CREATE TABLE audit_log (
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT,
    user_name   VARCHAR(100),
    user_email  VARCHAR(150),
    action      VARCHAR(20)  NOT NULL,
    event_id    BIGINT,
    event_title VARCHAR(150) NOT NULL,
    details     VARCHAR(500),
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT ck_audit_action CHECK (action IN ('CREATE', 'UPDATE', 'SUBMIT', 'APPROVE', 'REJECT')),
    CONSTRAINT fk_audit_user  FOREIGN KEY (user_id)  REFERENCES users (id)  ON DELETE SET NULL,
    CONSTRAINT fk_audit_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE SET NULL,
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_event (event_id)
);
