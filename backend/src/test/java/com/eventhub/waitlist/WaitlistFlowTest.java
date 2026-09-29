package com.eventhub.waitlist;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.lessThanOrEqualTo;
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
 * Phase 7 step 1: the smart waitlist through the real URLs.
 * Event 16 = Arduino Basics Workshop (₹150, 5 seats left), 1 = Tech Fest (40 left), 5 = a DRAFT.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class WaitlistFlowTest {

	private static final long ARDUINO = 16;

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	@Autowired
	private EventRepository events;

	@Autowired
	private WaitlistEntryRepository entries;

	@Autowired
	private WaitlistService service;

	private ResultActions book(User user, long eventId, int quantity) throws Exception {
		return mvc.perform(post("/api/bookings").with(accounts.as(user)).contentType(MediaType.APPLICATION_JSON)
			.content("{\"eventId\": %d, \"quantity\": %d}".formatted(eventId, quantity)));
	}

	private ResultActions join(User user, long eventId, int quantity) throws Exception {
		return mvc.perform(post("/api/waitlist").with(accounts.as(user)).contentType(MediaType.APPLICATION_JSON)
			.content("{\"eventId\": %d, \"quantity\": %d}".formatted(eventId, quantity)));
	}

	private ResultActions entry(User user, long id) throws Exception {
		return mvc.perform(get("/api/waitlist/" + id).with(accounts.as(user)));
	}

	private long idOf(ResultActions result) throws Exception {
		return ((Number) JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.id")).longValue();
	}

	private int seatsLeft(long eventId) {
		return events.findById(eventId).orElseThrow().getAvailableSeats();
	}

	/** Takes all 5 Arduino seats, so the event is sold out. Returns the booking id. */
	private long soldOut(User who) throws Exception {
		long bookingId = idOf(book(who, ARDUINO, 5));
		assertThat(seatsLeft(ARDUINO)).isZero();
		return bookingId;
	}

	@Test
	void joinShowsMyPositionAndTheRulesAreChecked() throws Exception {
		User asha = accounts.student();
		soldOut(asha);
		User bala = accounts.student();
		User chitra = accounts.student();

		join(bala, ARDUINO, 3).andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("WAITING"))
			.andExpect(jsonPath("$.position").value(1))
			.andExpect(jsonPath("$.event.title").value("Arduino Basics Workshop"));
		join(chitra, ARDUINO, 1).andExpect(status().isCreated()).andExpect(jsonPath("$.position").value(2));

		join(bala, ARDUINO, 1).andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value("You are already on the waitlist for Arduino Basics Workshop."));
		join(asha, ARDUINO, 1).andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value("You already have seats for Arduino Basics Workshop. See My tickets."));
		join(chitra, 1, 1).andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value("40 seats are free for Tech Fest 2026, so you can book now - no need to wait."));
		join(chitra, 5, 1).andExpect(status().isNotFound());     // a DRAFT does not exist for students
		join(chitra, ARDUINO, 11).andExpect(status().isBadRequest());
	}

	@Test
	void cancellingOffersTheSeatsToTheQueueAndTheOfferBecomesABooking() throws Exception {
		User asha = accounts.student();
		long ashaBooking = soldOut(asha);
		User bala = accounts.student();
		User chitra = accounts.student();
		long balaPlace = idOf(join(bala, ARDUINO, 3));
		long chitraPlace = idOf(join(chitra, ARDUINO, 1));

		// Asha cancels her 5 seats: #1 Bala (3) and #2 Chitra (1) get offers, 1 seat is left for anyone
		mvc.perform(post("/api/bookings/" + ashaBooking + "/cancel").with(accounts.as(asha))).andExpect(status().isOk());
		entry(bala, balaPlace).andExpect(jsonPath("$.status").value("OFFERED"))
			.andExpect(jsonPath("$.position").doesNotExist())
			.andExpect(jsonPath("$.secondsLeft", greaterThan(1790)))
			.andExpect(jsonPath("$.secondsLeft", lessThanOrEqualTo(1800)));
		entry(chitra, chitraPlace).andExpect(jsonPath("$.status").value("OFFERED"));
		assertThat(seatsLeft(ARDUINO)).isEqualTo(1); // the offered seats are kept, not on sale

		// kept seats cannot be booked around the offer
		book(chitra, ARDUINO, 1).andExpect(status().isConflict()).andExpect(jsonPath("$.detail")
			.value("Seats of Arduino Basics Workshop are kept for you. Accept the offer on the Waitlist page."));

		// Bala accepts: a normal HELD booking for his 3 seats (then he pays as usual)
		mvc.perform(post("/api/waitlist/" + balaPlace + "/accept").with(accounts.as(bala)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("HELD"))
			.andExpect(jsonPath("$.quantity").value(3))
			.andExpect(jsonPath("$.amount").value(450.0));
		entry(bala, balaPlace).andExpect(jsonPath("$.status").value("BOOKED")).andExpect(jsonPath("$.bookingId").isNumber());
		assertThat(seatsLeft(ARDUINO)).isEqualTo(1); // accepting does not take seats twice
		mvc.perform(post("/api/waitlist/" + balaPlace + "/accept").with(accounts.as(bala))).andExpect(status().isConflict());

		// Chitra says no thanks: her kept seat goes back on sale
		mvc.perform(post("/api/waitlist/" + chitraPlace + "/leave").with(accounts.as(chitra)))
			.andExpect(status().isOk()).andExpect(jsonPath("$.status").value("LEFT"));
		assertThat(seatsLeft(ARDUINO)).isEqualTo(2);
	}

	@Test
	void anOfferNotAcceptedIn30MinutesGoesToTheNextStudent() throws Exception {
		User asha = accounts.student();
		long ashaBooking = soldOut(asha);
		User bala = accounts.student();
		User chitra = accounts.student();
		long balaPlace = idOf(join(bala, ARDUINO, 5));
		long chitraPlace = idOf(join(chitra, ARDUINO, 5));

		mvc.perform(post("/api/bookings/" + ashaBooking + "/cancel").with(accounts.as(asha)));
		entry(bala, balaPlace).andExpect(jsonPath("$.status").value("OFFERED"));
		entry(chitra, chitraPlace).andExpect(jsonPath("$.status").value("WAITING")).andExpect(jsonPath("$.position").value(1));

		WaitlistEntry offer = entries.findById(balaPlace).orElseThrow();
		offer.setOfferExpiresAt(LocalDateTime.now().minusMinutes(1)); // pretend 30 minutes passed
		entries.saveAndFlush(offer);
		assertThat(service.expireOldOffers()).isEqualTo(1);

		entry(bala, balaPlace).andExpect(jsonPath("$.status").value("EXPIRED"));
		entry(chitra, chitraPlace).andExpect(jsonPath("$.status").value("OFFERED"));
		assertThat(seatsLeft(ARDUINO)).isZero();
		mvc.perform(post("/api/waitlist/" + balaPlace + "/accept").with(accounts.as(bala))).andExpect(status().isConflict());
	}

	@Test
	void aGroupThatDoesNotFitKeepsItsPlace() throws Exception {
		User asha = accounts.student();
		User dev = accounts.student();
		idOf(book(asha, ARDUINO, 3));
		long devBooking = idOf(book(dev, ARDUINO, 2));
		User bala = accounts.student();
		User chitra = accounts.student();
		long balaPlace = idOf(join(bala, ARDUINO, 3));
		long chitraPlace = idOf(join(chitra, ARDUINO, 2));

		// 2 seats come back: #1 Bala needs 3 (does not fit), so #2 Chitra (2) gets them
		mvc.perform(post("/api/bookings/" + devBooking + "/cancel").with(accounts.as(dev)));
		entry(bala, balaPlace).andExpect(jsonPath("$.status").value("WAITING")).andExpect(jsonPath("$.position").value(1));
		entry(chitra, chitraPlace).andExpect(jsonPath("$.status").value("OFFERED"));
		assertThat(seatsLeft(ARDUINO)).isZero();
	}

	@Test
	void visitorsMustLogInAndOthersCannotSeeMyPlace() throws Exception {
		soldOut(accounts.student());
		User bala = accounts.student();
		long place = idOf(join(bala, ARDUINO, 1));
		mvc.perform(post("/api/waitlist").with(TestAccounts.csrfToken()).contentType(MediaType.APPLICATION_JSON)
				.content("{\"eventId\": 16, \"quantity\": 1}"))
			.andExpect(status().isUnauthorized());
		User other = accounts.student();
		entry(other, place).andExpect(status().isNotFound());
		mvc.perform(post("/api/waitlist/" + place + "/leave").with(accounts.as(other))).andExpect(status().isNotFound());
		mvc.perform(get("/api/waitlist/mine").with(accounts.as(bala)))
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].position").value(1));
	}

}
