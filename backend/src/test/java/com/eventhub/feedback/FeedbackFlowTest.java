package com.eventhub.feedback;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.user.User;
import com.jayway.jsonpath.JsonPath;

/** Phase 7 step 6: feedback. Event 3 = Intro to Git (free, Coding Club = club 1). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FeedbackFlowTest {

	private static final long GIT = 3;

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	@Autowired
	private EventRepository events;

	/** Books Intro to Git; scanned = went through the gate. Returns the booking id. */
	private long attend(User student, boolean scanned) throws Exception {
		String json = mvc.perform(post("/api/bookings").with(accounts.as(student)).contentType(MediaType.APPLICATION_JSON)
				.content("{\"eventId\": " + GIT + ", \"quantity\": 1}"))
			.andReturn().getResponse().getContentAsString();
		if (scanned) {
			mvc.perform(post("/api/gate/events/" + GIT + "/check-in").with(accounts.as(accounts.volunteerOf(1L)))
					.contentType(MediaType.APPLICATION_JSON).content("{\"code\": \"" + JsonPath.read(json, "$.ticketCode") + "\"}"))
				.andExpect(jsonPath("$.result").value("VALID"));
		}
		return ((Number) JsonPath.read(json, "$.id")).longValue();
	}

	private void eventIsOver() {
		Event git = events.findById(GIT).orElseThrow();
		git.setStartTime(LocalDateTime.now().minusDays(1).withHour(14));
		git.setEndTime(LocalDateTime.now().minusDays(1).withHour(17));
		events.saveAndFlush(git);
	}

	private ResultActions rate(User student, long bookingId, int stars, String comment) throws Exception {
		String body = comment == null ? "{\"rating\": %d}".formatted(stars)
				: "{\"rating\": %d, \"comment\": \"%s\"}".formatted(stars, comment);
		return mvc.perform(put("/api/bookings/" + bookingId + "/feedback").with(accounts.as(student))
			.contentType(MediaType.APPLICATION_JSON).content(body));
	}

	@Test
	void attendeesRateAfterTheEventAndCanChangeTheirMind() throws Exception {
		User asha = accounts.student();
		long booking = attend(asha, true);

		rate(asha, booking, 5, "Great").andExpect(status().isConflict()) // not over yet
			.andExpect(jsonPath("$.detail").value("You can rate Intro to Git and GitHub after it ends."));

		eventIsOver();
		mvc.perform(get("/api/feedback/mine").with(accounts.as(asha)))
			.andExpect(jsonPath("$[0].bookingId").value(booking))
			.andExpect(jsonPath("$[0].rating").doesNotExist()); // waiting for a rating

		rate(asha, booking, 4, "Good hands-on session").andExpect(status().isOk()).andExpect(jsonPath("$.rating").value(4));
		rate(asha, booking, 5, "  ").andExpect(status().isOk()) // changed her mind; blank comment = none
			.andExpect(jsonPath("$.rating").value(5))
			.andExpect(jsonPath("$.comment").doesNotExist());
		mvc.perform(get("/api/feedback/mine").with(accounts.as(asha))).andExpect(jsonPath("$[0].rating").value(5));
	}

	@Test
	void studentsWhoDidNotComeCannotRate() throws Exception {
		User bala = accounts.student();
		long booking = attend(bala, false);
		eventIsOver();
		rate(bala, booking, 1, "Bad").andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value("Only students who attended Intro to Git and GitHub (ticket scanned at the gate) can rate it."));
		rate(accounts.student(), booking, 5, null).andExpect(status().isNotFound()); // not your booking
		rate(bala, booking, 6, null).andExpect(status().isBadRequest());              // 1 to 5 only
	}

	@Test
	void organizersSeeTheAverageStarsAndAnonymousComments() throws Exception {
		User asha = accounts.student();
		User bala = accounts.student();
		User chitra = accounts.student();
		long a = attend(asha, true);
		long b = attend(bala, true);
		long c = attend(chitra, true);
		eventIsOver();
		rate(asha, a, 5, "Loved the Git branching demo");
		rate(bala, b, 4, null);
		rate(chitra, c, 3, "Too fast for beginners");

		mvc.perform(get("/api/organizer/events/" + GIT + "/feedback").with(accounts.as(accounts.organizerOf(1L))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.count").value(3))
			.andExpect(jsonPath("$.average").value(4.0))
			.andExpect(jsonPath("$.stars[2]").value(1))   // one 3-star
			.andExpect(jsonPath("$.stars[4]").value(1))   // one 5-star
			.andExpect(jsonPath("$.attended").value(3))
			.andExpect(jsonPath("$.comments.length()").value(2))
			.andExpect(jsonPath("$.comments[0].name").doesNotExist())
			.andExpect(jsonPath("$.comments[0].email").doesNotExist());

		mvc.perform(get("/api/organizer/events/" + GIT + "/feedback").with(accounts.as(accounts.organizerOf(2L))))
			.andExpect(status().isForbidden()); // another club
		mvc.perform(get("/api/organizer/events/" + GIT + "/feedback").with(accounts.as(asha)))
			.andExpect(status().isForbidden());
	}

}
