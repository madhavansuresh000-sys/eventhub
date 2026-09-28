-- EventHub V1: core tables for Phase 2 (users, roles, profiles, clubs, club_members, events, tags, event_tags)
-- Status columns use VARCHAR + CHECK (not MySQL ENUM) so they map cleanly to Java enums.

CREATE TABLE roles (
    id   BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE               -- STUDENT, ADMIN
);

CREATE TABLE users (
    id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

-- many-to-many: a user can have several roles
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id)
);

-- one-to-one: each user has one profile
CREATE TABLE profiles (
    id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT       NOT NULL UNIQUE,
    department    VARCHAR(100),
    year_of_study TINYINT,
    phone         VARCHAR(20),
    bio           VARCHAR(500),
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE clubs (
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,      -- used in URLs: /clubs/coding-club
    description VARCHAR(1000),
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

-- who belongs to which club, and with what club role
CREATE TABLE club_members (
    id        BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    club_id   BIGINT      NOT NULL,
    user_id   BIGINT      NOT NULL,
    club_role VARCHAR(20) NOT NULL,
    joined_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_club_members UNIQUE (club_id, user_id),
    CONSTRAINT ck_club_members_role CHECK (club_role IN ('ORGANIZER', 'VOLUNTEER', 'MEMBER')),
    CONSTRAINT fk_club_members_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE,
    CONSTRAINT fk_club_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- one-to-many: one club runs many events
CREATE TABLE events (
    id              BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    club_id         BIGINT        NOT NULL,
    created_by      BIGINT,                          -- organizer (NULL for seed data)
    title           VARCHAR(150)  NOT NULL,
    description     TEXT,
    venue           VARCHAR(150)  NOT NULL,
    start_time      DATETIME(6)   NOT NULL,
    end_time        DATETIME(6)   NOT NULL,
    total_seats     INT           NOT NULL,
    available_seats INT           NOT NULL,
    price           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status          VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    review_note     VARCHAR(500),                    -- admin's reason when sending back to DRAFT
    version         INT           NOT NULL DEFAULT 0, -- optimistic locking (no overselling)
    created_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT ck_events_status CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED')),
    CONSTRAINT ck_events_seats CHECK (total_seats > 0 AND available_seats BETWEEN 0 AND total_seats),
    CONSTRAINT ck_events_time CHECK (end_time > start_time),
    CONSTRAINT ck_events_price CHECK (price >= 0),
    CONSTRAINT fk_events_club FOREIGN KEY (club_id) REFERENCES clubs (id),
    CONSTRAINT fk_events_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX ix_events_status_start ON events (status, start_time);

CREATE TABLE tags (
    id   BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE                 -- lower-case: tech, music, sports ...
);

-- many-to-many: an event has many tags, a tag is on many events
CREATE TABLE event_tags (
    event_id BIGINT NOT NULL,
    tag_id   BIGINT NOT NULL,
    PRIMARY KEY (event_id, tag_id),
    CONSTRAINT fk_event_tags_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_event_tags_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);
