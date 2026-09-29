package com.eventhub.gate;

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

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.eventhub.booking.Booking;
import com.eventhub.booking.BookingRepository;
import com.eventhub.booking.BookingStatus;
import com.eventhub.club.ClubRepository;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventStatus;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;

/**
 * 20 volunteers at 20 gates scan the SAME ticket at the same moment (a screenshot shared in a WhatsApp group).
 * Exactly ONE may get VALID. NOT @Transactional (each scan needs its own real transaction), so this test
 * makes its own event, student and booking and deletes them afterwards.
 */
@SpringBootTest
class GateConcurrencyTest {

	private static final int GATES = 20;

	@Autowired
	private CheckInService service;

	@Autowired
	private EventRepository events;

	@Autowired
	private ClubRepository clubs;

	@Autowired
	private UserRepository users;

	@Autowired
	private BookingRepository bookings;

	@Autowired
	private JdbcTemplate jdbc;

	private Long eventId;

	private Long studentId;

	private final String code = "EVH-RACE" + (System.nanoTime() % 10_000_000);

	@BeforeEach
	void createTicket() {
		Event event = new Event();
		event.setClub(clubs.getReferenceById(1L));
		event.setTitle("Gate Race Test " + System.nanoTime());
		event.setVenue("Test Hall");
		event.setStartTime(LocalDateTime.now().plusDays(1));
		event.setEndTime(LocalDateTime.now().plusDays(1).plusHours(2));
		event.setTotalSeats(10);
		event.setAvailableSeats(9);
		event.setPrice(BigDecimal.ZERO);
		event.setStatus(EventStatus.PUBLISHED);
		eventId = events.save(event).getId();

		User student = new User();
		student.setEmail("gate-race-" + System.nanoTime() + "@example.com");
		student.setFullName("Race Student");
		student.setPasswordHash("not-used");
		studentId = users.save(student).getId();

		Booking b = new Booking();
		b.setUser(users.getReferenceById(studentId));
		b.setEvent(events.getReferenceById(eventId));
		b.setQuantity(1);
		b.setAmount(BigDecimal.ZERO);
		b.setTicketCode(code);
		b.setStatus(BookingStatus.CONFIRMED);
		b.setConfirmedAt(LocalDateTime.now());
		bookings.save(b);
	}

	@AfterEach
	void cleanUp() {
		jdbc.update("delete from bookings where event_id = ?", eventId);
		jdbc.update("delete from events where id = ?", eventId);
		jdbc.update("delete from users where id = ?", studentId);
	}

	@RepeatedTest(3)
	void twentyGatesScanTheSameTicketAtOnceOnlyOneLetsIn() throws Exception {
		ConcurrentLinkedQueue<CheckInResult> results = new ConcurrentLinkedQueue<>();
		CountDownLatch startGun = new CountDownLatch(1);
		ExecutorService pool = Executors.newFixedThreadPool(GATES);
		List<Future<?>> runs = new ArrayList<>();
		for (int i = 0; i < GATES; i++) {
			runs.add(pool.submit(() -> {
				startGun.await();
				results.add(service.checkIn(eventId, code, studentId).result());
				return null;
			}));
		}
		startGun.countDown(); // ... and GO
		for (Future<?> run : runs) {
			run.get(); // re-throws anything unexpected
		}
		pool.shutdown();

		assertThat(results).hasSize(GATES);
		assertThat(results.stream().filter(r -> r == CheckInResult.VALID)).hasSize(1);
		assertThat(results.stream().filter(r -> r == CheckInResult.ALREADY_USED)).hasSize(GATES - 1);
		assertThat(service.stats(eventId).checkedInPeople()).isEqualTo(1);
	}

}
