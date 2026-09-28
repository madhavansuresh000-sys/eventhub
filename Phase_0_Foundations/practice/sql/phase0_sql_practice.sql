-- =====================================================================
-- EventHub Phase 0 - SQL practice
-- Runs on its own database (sql_practice), so it never touches EventHub data.
-- Run it:  see practice/README.md
-- =====================================================================

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS students;

-- ---------- 1. Tables ----------
CREATE TABLE students (
    id         INT PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    department VARCHAR(30) NOT NULL,
    year       INT NOT NULL
);

CREATE TABLE events (
    id          INT PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,
    club        VARCHAR(50)  NOT NULL,
    event_date  DATE         NOT NULL,
    total_seats INT          NOT NULL,
    price       DECIMAL(8,2) NOT NULL DEFAULT 0
);

CREATE TABLE bookings (
    id         INT PRIMARY KEY,
    student_id INT NOT NULL,
    event_id   INT NOT NULL,
    status     VARCHAR(10) NOT NULL,          -- CONFIRMED or CANCELLED
    FOREIGN KEY (student_id) REFERENCES students (id),
    FOREIGN KEY (event_id)   REFERENCES events (id)
);

-- ---------- 2. Sample data ----------
INSERT INTO students VALUES
 (101, 'Madhavan', 'CSE', 3), (102, 'Priya', 'ECE', 2), (103, 'Arjun', 'Mechanical', 3),
 (104, 'Divya', 'IT', 1),     (105, 'Karthik', 'CSE', 4);

INSERT INTO events VALUES
 (1, 'Tech Fest 2026',    'Coding Club',   '2026-10-12', 200, 100.00),
 (2, 'Dance Night',       'Cultural Club', '2026-10-15',   2, 120.00),
 (3, '24-Hour Hackathon', 'Coding Club',   '2026-10-20',   3, 150.00),
 (4, 'Yoga Morning',      'Sports Club',   '2026-10-10',  80,   0.00);

INSERT INTO bookings VALUES
 (1, 101, 1, 'CONFIRMED'), (2, 102, 1, 'CONFIRMED'), (3, 101, 2, 'CANCELLED'),
 (4, 102, 2, 'CONFIRMED'), (5, 103, 2, 'CONFIRMED'), (6, 101, 3, 'CONFIRMED'),
 (7, 105, 3, 'CONFIRMED');                     -- Divya (104) has no booking yet

-- ---------- 3. SELECT: read rows ----------
-- Q1. All events, cheapest first                                        (4 rows)
SELECT title, club, price FROM events ORDER BY price;

-- ---------- 4. WHERE: keep only matching rows ----------
-- Q2. Free events                                                       (1 row: Yoga Morning)
SELECT title FROM events WHERE price = 0;

-- Q3. CSE students in year 3 or above                                   (2 rows: Madhavan, Karthik)
SELECT name, year FROM students WHERE department = 'CSE' AND year >= 3;

-- Q4. Events in the second half of October                              (2 rows)
SELECT title, event_date FROM events WHERE event_date BETWEEN '2026-10-15' AND '2026-10-31';

-- ---------- 5. JOIN: combine tables ----------
-- Q5. Who booked what (confirmed only)                                  (6 rows)
SELECT s.name, e.title, b.status
FROM bookings b
JOIN students s ON s.id = b.student_id
JOIN events   e ON e.id = b.event_id
WHERE b.status = 'CONFIRMED'
ORDER BY s.name, e.title;

-- Q6. LEFT JOIN keeps EVERY student, even one with no booking     (5 rows, Divya shows 0)
--     Try changing LEFT JOIN to JOIN: Divya disappears. That is the difference!
SELECT s.name, COUNT(b.id) AS confirmed_bookings
FROM students s
LEFT JOIN bookings b ON b.student_id = s.id AND b.status = 'CONFIRMED'
GROUP BY s.id, s.name
ORDER BY confirmed_bookings DESC, s.name;

-- ---------- 6. GROUP BY: totals per group ----------
-- Q7. Seats booked and seats left per event                             (4 rows)
SELECT e.title,
       e.total_seats,
       COUNT(b.id)                 AS booked,
       e.total_seats - COUNT(b.id) AS seats_left
FROM events e
LEFT JOIN bookings b ON b.event_id = e.id AND b.status = 'CONFIRMED'
GROUP BY e.id, e.title, e.total_seats
ORDER BY e.id;

-- Q8. Money collected per club (price x confirmed bookings)             (2 rows)
SELECT e.club, SUM(e.price) AS revenue, COUNT(*) AS tickets
FROM bookings b
JOIN events e ON e.id = b.event_id
WHERE b.status = 'CONFIRMED'
GROUP BY e.club
ORDER BY revenue DESC;

-- ---------- 7. HAVING: filter groups (WHERE filters rows, HAVING filters groups) ----------
-- Q9. Sold-out events                                                   (1 row: Dance Night)
SELECT e.title
FROM events e
JOIN bookings b ON b.event_id = e.id AND b.status = 'CONFIRMED'
GROUP BY e.id, e.title, e.total_seats
HAVING COUNT(b.id) >= e.total_seats;

-- Q10. Students with 2 or more confirmed bookings                       (2 rows: Madhavan, Priya)
SELECT s.name, COUNT(*) AS bookings
FROM students s
JOIN bookings b ON b.student_id = s.id AND b.status = 'CONFIRMED'
GROUP BY s.id, s.name
HAVING COUNT(*) >= 2;
