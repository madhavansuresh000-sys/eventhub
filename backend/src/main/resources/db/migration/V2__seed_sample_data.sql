-- EventHub V2: sample data for development (roles, 5 clubs, 10 tags, 20 events)
-- Users are added in Phase 5 (login), so seed events have created_by = NULL.

INSERT INTO roles (name) VALUES ('STUDENT'), ('ADMIN');

INSERT INTO clubs (id, name, slug, description) VALUES
 (1, 'Coding Club',    'coding-club',    'Hackathons, coding contests and developer workshops.'),
 (2, 'Cultural Club',  'cultural-club',  'Dance, music and drama nights for the whole college.'),
 (3, 'Sports Club',    'sports-club',    'Tournaments, marathons and fitness events.'),
 (4, 'Robotics Club',  'robotics-club',  'Build, program and race robots.'),
 (5, 'Career Cell',    'career-cell',    'Placement talks, resume clinics and mock interviews.');

INSERT INTO tags (id, name) VALUES
 (1, 'tech'), (2, 'coding'), (3, 'workshop'), (4, 'music'), (5, 'dance'),
 (6, 'sports'), (7, 'robotics'), (8, 'career'), (9, 'arts'), (10, 'competition');

INSERT INTO events (id, club_id, title, description, venue, start_time, end_time, total_seats, available_seats, price, status) VALUES
 ( 1, 1, 'Tech Fest 2026',             'Two-day festival of talks, demos and project expos.',        'Main Auditorium',   '2026-10-12 10:00:00', '2026-10-13 17:00:00', 200,  40, 100.00, 'PUBLISHED'),
 ( 2, 1, '24-Hour Hackathon',          'Build a product in 24 hours with your team of four.',       'CSE Block Lab 1',   '2026-10-20 09:00:00', '2026-10-21 09:00:00', 120,  10, 150.00, 'PUBLISHED'),
 ( 3, 1, 'Intro to Git and GitHub',    'Hands-on workshop: commits, branches and pull requests.',   'CSE Block Lab 2',   '2026-10-08 14:00:00', '2026-10-08 17:00:00',  60,  22,   0.00, 'PUBLISHED'),
 ( 4, 1, 'Competitive Coding Contest', 'Solve 6 problems in 3 hours. Prizes for the top 3.',        'CSE Block Lab 1',   '2026-11-05 10:00:00', '2026-11-05 13:00:00', 100,  55,  50.00, 'PUBLISHED'),
 ( 5, 1, 'Spring Boot Bootcamp',       'Build a REST API with Spring Boot and MySQL in one day.',   'Seminar Hall A',    '2026-11-15 09:30:00', '2026-11-15 16:30:00',  80,  80, 200.00, 'DRAFT'),
 ( 6, 2, 'Dance Night',                'Inter-department dance battle and open floor.',             'Open Air Theatre',  '2026-10-15 18:00:00', '2026-10-15 22:00:00', 300,   0, 120.00, 'PUBLISHED'),
 ( 7, 2, 'Battle of Bands',            'College bands compete live. Vote for your favourite.',     'Open Air Theatre',  '2026-10-25 17:00:00', '2026-10-25 21:00:00', 400, 150, 150.00, 'PUBLISHED'),
 ( 8, 2, 'Classical Music Evening',    'Carnatic and Hindustani performances by students.',        'Main Auditorium',   '2026-11-02 18:00:00', '2026-11-02 20:30:00', 250, 190,   0.00, 'PUBLISHED'),
 ( 9, 2, 'Street Play Festival',       'Short street plays on social themes.',                     'College Ground',    '2026-11-20 16:00:00', '2026-11-20 19:00:00', 500, 500,   0.00, 'PENDING_APPROVAL'),
 (10, 2, 'Art and Craft Exhibition',   'Paintings, sketches and crafts made by students.',         'Library Foyer',     '2026-10-28 10:00:00', '2026-10-30 17:00:00', 150, 120,   0.00, 'PUBLISHED'),
 (11, 3, 'Inter-College Cricket Cup',  'T20 tournament with 8 colleges.',                          'College Ground',    '2026-10-18 08:00:00', '2026-10-19 18:00:00', 600, 320,  50.00, 'PUBLISHED'),
 (12, 3, 'Campus Marathon 5K',         'Run for fitness. Medals for every finisher.',              'Main Gate',         '2026-11-08 06:00:00', '2026-11-08 09:00:00', 500, 260, 100.00, 'PUBLISHED'),
 (13, 3, 'Badminton Doubles',          'Knock-out doubles tournament, mixed teams allowed.',       'Indoor Stadium',    '2026-11-12 15:00:00', '2026-11-12 20:00:00',  64,  12,  80.00, 'PUBLISHED'),
 (14, 3, 'Yoga Morning',               'Relaxing guided yoga session for beginners.',              'Indoor Stadium',    '2026-10-10 06:30:00', '2026-10-10 07:30:00',  80,  35,   0.00, 'PUBLISHED'),
 (15, 4, 'Robo Race',                  'Line-follower robots race on a tricky track.',             'Mechanical Block',  '2026-10-22 10:00:00', '2026-10-22 16:00:00', 100,  48, 100.00, 'PUBLISHED'),
 (16, 4, 'Arduino Basics Workshop',    'Blink LEDs and read sensors with Arduino.',                'ECE Lab 3',         '2026-10-14 14:00:00', '2026-10-14 17:00:00',  40,   5, 150.00, 'PUBLISHED'),
 (17, 4, 'Drone Building Workshop',    'Assemble and fly a mini drone in teams.',                  'ECE Lab 3',         '2026-11-25 10:00:00', '2026-11-25 16:00:00',  30,  30, 500.00, 'PENDING_APPROVAL'),
 (18, 5, 'Resume Clinic',              'Get your resume reviewed by seniors and alumni.',          'Seminar Hall B',    '2026-10-16 11:00:00', '2026-10-16 13:00:00',  50,  18,   0.00, 'PUBLISHED'),
 (19, 5, 'Mock Interview Day',         'Practice technical and HR interviews with alumni.',        'Placement Cell',    '2026-11-10 09:00:00', '2026-11-10 17:00:00',  60,  41,   0.00, 'PUBLISHED'),
 (20, 5, 'Alumni Career Talk',         'Alumni from top companies share their journey.',           'Main Auditorium',   '2026-12-02 15:00:00', '2026-12-02 17:00:00', 250, 250,   0.00, 'DRAFT');

INSERT INTO event_tags (event_id, tag_id) VALUES
 (1, 1), (1, 2),
 (2, 1), (2, 2), (2, 10),
 (3, 1), (3, 2), (3, 3),
 (4, 1), (4, 2), (4, 10),
 (5, 1), (5, 2), (5, 3),
 (6, 5), (6, 10),
 (7, 4), (7, 10),
 (8, 4),
 (9, 9),
 (10, 9),
 (11, 6), (11, 10),
 (12, 6),
 (13, 6), (13, 10),
 (14, 6),
 (15, 1), (15, 7), (15, 10),
 (16, 1), (16, 7), (16, 3),
 (17, 1), (17, 7), (17, 3),
 (18, 8), (18, 3),
 (19, 8),
 (20, 8);
