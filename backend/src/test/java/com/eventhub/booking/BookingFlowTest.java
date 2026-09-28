package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.lessThanOrEqualTo;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.auth.TestAccounts;
import com.eventhub.event.EventRepository;
import com.eventhub.user.User;
import com.jayway.jsonpath.JsonPath;

/**
 * Phase 6: the booking engine through the real URLs (built-in test payment gateway).
 * Event 1 = Tech Fest (₹100, 40 left), 3 = Intro to Git (free), 6 = Dance Night (sold out), 16 = Arduino (5 left).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BookingFlowTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	@Autowired
	private EventRepository events;

	@Autowired
	private BookingRepository bookings;

	@Autowired
	private BookingService service;

	private ResultActions book(User user, long eventId, int quantity) throws Exception {
		return mvc.perform(post("/api/bookings").with(accounts.as(user)).contentType(MediaType.APPLICATION_JSON)
			.content("{\"eventId\": %d, \"quantity\": %d}".formatted(eventId, quantity)));
	}

	private long idOf(ResultActions result) throws Exception {
		return ((Number) JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.id")).longValue();
	}

	private int seatsLeft(long eventId) {
		return events.findById(eventId).orElseThrow().getAvailableSeats();
	}

	// ---------- step 2 + 5: hold ----------

	@Test
	void paidEventIsHeldForTenMinutesAndSeatsGoDown() throws Exception {
		book(accounts.student(), 1, 2)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("HELD"))
			.andExpect(jsonPath("$.amount").value(200.0))
			.andExpect(jsonPath("$.secondsLeft", greaterThan(590)))
			.andExpect(jsonPath("$.secondsLeft", lessThanOrEqualTo(600)))
			.andExpect(jsonPath("$.ticketCode", startsWith("EVH-")))
			.andExpect(jsonPath("$.event.title").value("Tech Fest 2026"));
		assertThat(seatsLeft(1)).isEqualTo(38);
	}

	@Test
	void freeEventIsConfirmedAtOnce() throws Exception {
		book(accounts.student(), 3, 1)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("CONFIRMED"))
			.andExpect(jsonPath("$.amount").value(0));
		assertThat(seatsLeft(3)).isEqualTo(21);
	}

	@Test
	void rulesAreChecked() throws Exception {
		User ravi = accounts.student();
		book(ravi, 6, 1).andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value("Dance Night is sold out. You can join the waitlist."));
		book(ravi, 16, 6).andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value("Only 5 seats are left for Arduino Basics Workshop."));
		book(ravi, 16, 11).andExpect(status().isBadRequest()); // more than 10 at once
		book(ravi, 5, 1).andExpect(status().isNotFound());     // a DRAFT event does not exist for students

		book(ravi, 1, 1).andExpect(status().isCreated());
		book(ravi, 1, 1).andExpect(status().isConflict())      // one booking per student per event
			.andExpect(jsonPath("$.detail").value("You already have seats for Tech Fest 2026. See My tickets."));
	}

	@Test
	void visitorsMustLogInAndOthersCannotSeeMyBooking() throws Exception {
		long id = idOf(book(accounts.student(), 1, 1));
		mvc.perform(post("/api/bookings").with(TestAccounts.csrfToken()).contentType(MediaType.APPLICATION_JSON)
				.content("{\"eventId\": 1, \"quantity\": 1}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(get("/api/bookings/" + id).with(accounts.as(accounts.student())))
			.andExpect(status().isNotFound());
	}

	// ---------- step 6-8: pay, confirm, idempotency ----------

	@Test
	void payConfirmAndTheSameNoticeTwiceChangesNothing() throws Exception {
		User ravi = accounts.student();
		long id = idOf(book(ravi, 1, 2));

		String json = mvc.perform(post("/api/bookings/" + id + "/pay").with(accounts.as(ravi)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.provider").value("FAKE"))
			.andExpect(jsonPath("$.redirectUrl", startsWith("http://localhost:5173/test-payment/fake_cs_")))
			.andReturn().getResponse().getContentAsString();
		String session = JsonPath.read(json, "$.sessionId");

		mvc.perform(post("/api/payments/fake/" + session + "/complete").with(accounts.as(ravi)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("CONFIRMED"))
			.andExpect(jsonPath("$.secondsLeft").value(0));

		// the payment company sends the same message again: ignored
		assertThat(service.markPaid("fake_evt_" + session, session)).isEqualTo(BookingService.PaidResult.DUPLICATE_NOTICE);
		// a different message about the same, already-paid session: also no change
		assertThat(service.markPaid("evt_other", session)).isEqualTo(BookingService.PaidResult.ALREADY_DONE);
		assertThat(seatsLeft(1)).isEqualTo(38); // seats taken once, not twice
	}

	@Test
	void anotherStudentCannotPayOrCompleteMyPayment() throws Exception {
		User ravi = accounts.student();
		long id = idOf(book(ravi, 1, 1));
		String session = JsonPath.read(mvc.perform(post("/api/bookings/" + id + "/pay").with(accounts.as(ravi)))
			.andReturn().getResponse().getContentAsString(), "$.sessionId");
		User other = accounts.student();
		mvc.perform(post("/api/bookings/" + id + "/pay").with(accounts.as(other))).andExpect(status().isNotFound());
		mvc.perform(post("/api/payments/fake/" + session + "/complete").with(accounts.as(other)))
			.andExpect(status().isNotFound());
	}

	// ---------- step 4: hold expiry ----------

	private void makeHoldOld(long bookingId) {
		Booking b = bookings.findById(bookingId).orElseThrow();
		b.setHoldExpiresAt(LocalDateTime.now().minusMinutes(1));
		bookings.saveAndFlush(b);
	}

	@Test
	void unpaidHoldExpiresAndTheSeatsReturn() throws Exception {
		User ravi = accounts.student();
		long id = idOf(book(ravi, 16, 3));
		assertThat(seatsLeft(16)).isEqualTo(2);

		makeHoldOld(id);
		assertThat(service.expireOldHolds()).isGreaterThanOrEqualTo(1);

		mvc.perform(get("/api/bookings/" + id).with(accounts.as(ravi))).andExpect(jsonPath("$.status").value("EXPIRED"));
		assertThat(seatsLeft(16)).isEqualTo(5);
		mvc.perform(post("/api/bookings/" + id + "/pay").with(accounts.as(ravi))).andExpect(status().isConflict());
		book(ravi, 16, 1).andExpect(status().isCreated()); // an expired booking does not block booking again
	}

	@Test
	void paymentJustAfterExpiryIsConfirmedIfSeatsAreStillFree() throws Exception {
		User ravi = accounts.student();
		long id = idOf(book(ravi, 1, 1));
		String session = JsonPath.read(mvc.perform(post("/api/bookings/" + id + "/pay").with(accounts.as(ravi)))
			.andReturn().getResponse().getContentAsString(), "$.sessionId");
		makeHoldOld(id);
		service.expireOldHolds();

		assertThat(service.markPaid("evt_late", session)).isEqualTo(BookingService.PaidResult.CONFIRMED);
		assertThat(seatsLeft(1)).isEqualTo(39);
	}

	@Test
	void paymentAfterExpiryIsRefundedWhenTheSeatIsGone() throws Exception {
		User ravi = accounts.student();
		long id = idOf(book(ravi, 16, 5)); // all 5 remaining seats
		String session = JsonPath.read(mvc.perform(post("/api/bookings/" + id + "/pay").with(accounts.as(ravi)))
			.andReturn().getResponse().getContentAsString(), "$.sessionId");
		makeHoldOld(id);
		service.expireOldHolds();
		book(accounts.student(), 16, 5).andExpect(status().isCreated()); // someone else takes them

		assertThat(service.markPaid("evt_too_late", session)).isEqualTo(BookingService.PaidResult.REFUNDED_LATE);
		mvc.perform(get("/api/bookings/" + id).with(accounts.as(ravi))).andExpect(jsonPath("$.status").value("EXPIRED"));
		assertThat(seatsLeft(16)).isZero(); // never oversold
	}

	// ---------- step 9: cancel ----------

	@Test
	void cancelGivesTheSeatsBack() throws Exception {
		User ravi = accounts.student();
		long id = idOf(book(ravi, 3, 2));
		assertThat(seatsLeft(3)).isEqualTo(20);

		mvc.perform(post("/api/bookings/" + id + "/cancel").with(accounts.as(ravi)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("CANCELLED"))
			.andExpect(jsonPath("$.canCancel").value(false));
		assertThat(seatsLeft(3)).isEqualTo(22);
		mvc.perform(post("/api/bookings/" + id + "/cancel").with(accounts.as(ravi))).andExpect(status().isConflict());
	}

	@Test
	void myTicketsListsNewestFirst() throws Exception {
		User ravi = accounts.student();
		book(ravi, 3, 1);
		book(ravi, 1, 1);
		mvc.perform(get("/api/bookings/mine").with(accounts.as(ravi)))
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0].event.title").value("Tech Fest 2026"))
			.andExpect(jsonPath("$[1].event.clubName").value("Coding Club"));
	}

}
