package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.eventhub.club.ClubRepository;
import com.eventhub.common.BusinessRuleException;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventStatus;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;

/**
 * Phase 6 step 10 - the "IRCTC Tatkal" test:
 * 100 students press Book at the SAME moment for an event with 10 seats.
 * Exactly 10 must get a booking, the other 90 must be told "sold out", and the event must end at 0 seats.
 *
 * NOT @Transactional: every thread needs its own real, committed transactions,
 * so this test creates its own event and users and deletes them afterwards.
 */
@SpringBootTest
class BookingConcurrencyTest {

	private static final int SEATS = 10;

	private static final int STUDENTS = 100;

	@Autowired
	private BookingService service;

	@Autowired
	private EventRepository events;

	@Autowired
	private ClubRepository clubs;

	@Autowired
	private UserRepository users;

	@Autowired
	private JdbcTemplate jdbc;

	private Long eventId;

	private final List<Long> userIds = new ArrayList<>();

	@BeforeEach
	void createEventAndStudents() {
		Event event = new Event();
		event.setClub(clubs.getReferenceById(1L));
		event.setTitle("Tatkal Test " + System.nanoTime());
		event.setVenue("Test Hall");
		event.setStartTime(LocalDateTime.now().plusDays(10));
		event.setEndTime(LocalDateTime.now().plusDays(10).plusHours(2));
		event.setTotalSeats(SEATS);
		event.setAvailableSeats(SEATS);
		event.setPrice(new BigDecimal("99.00"));
		event.setStatus(EventStatus.PUBLISHED);
		eventId = events.save(event).getId();

		for (int i = 0; i < STUDENTS; i++) {
			User u = new User();
			u.setEmail("tatkal-" + System.nanoTime() + "-" + i + "@example.com");
			u.setFullName("Student " + i);
			u.setPasswordHash("not-used");
			userIds.add(users.save(u).getId());
		}
	}

	@AfterEach
	void cleanUp() {
		jdbc.update("delete from payments where booking_id in (select id from bookings where event_id = ?)", eventId);
		jdbc.update("delete from bookings where event_id = ?", eventId);
		jdbc.update("delete from events where id = ?", eventId);
		userIds.forEach(id -> jdbc.update("delete from users where id = ?", id));
		userIds.clear();
	}

	@RepeatedTest(3)
	void hundredStudentsTenSeatsExactlyTenBookings() throws Exception {
		AtomicInteger booked = new AtomicInteger();
		AtomicInteger soldOut = new AtomicInteger();
		ConcurrentLinkedQueue<Throwable> unexpected = new ConcurrentLinkedQueue<>();
		CountDownLatch startGun = new CountDownLatch(1);

		ExecutorService pool = Executors.newFixedThreadPool(STUDENTS);
		List<Future<?>> runs = new ArrayList<>();
		for (Long userId : userIds) {
			runs.add(pool.submit(() -> {
				try {
					startGun.await(); // everybody waits here ...
					service.hold(userId, eventId, 1);
					booked.incrementAndGet();
				}
				catch (BusinessRuleException ex) {
					if (ex.getMessage().contains("sold out") || ex.getMessage().contains("Only")) {
						soldOut.incrementAndGet();
					}
					else {
						unexpected.add(ex);
					}
				}
				catch (Throwable ex) {
					unexpected.add(ex);
				}
				return null;
			}));
		}
		startGun.countDown(); // ... and all 100 press "Book" together
		for (Future<?> run : runs) {
			run.get(60, TimeUnit.SECONDS);
		}
		pool.shutdown();

		assertThat(unexpected).as("unexpected errors").isEmpty();
		assertThat(booked.get()).as("successful bookings").isEqualTo(SEATS);
		assertThat(soldOut.get()).as("told 'sold out'").isEqualTo(STUDENTS - SEATS);
		assertThat(events.findById(eventId).orElseThrow().getAvailableSeats()).as("seats left").isZero();
		assertThat(jdbc.queryForObject("select count(*) from bookings where event_id = ?", Integer.class, eventId))
			.as("rows in bookings").isEqualTo(SEATS);
	}

}
