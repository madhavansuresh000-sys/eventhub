package com.eventhub.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.analytics.dto.AnalyticsResponse;
import com.eventhub.analytics.dto.AnalyticsResponse.DayPoint;
import com.eventhub.analytics.dto.AnalyticsResponse.EventRow;
import com.eventhub.auth.TestAccounts;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.user.User;
import com.jayway.jsonpath.JsonPath;

/**
 * Phase 7 step 7: the analytics dashboard and its cache.
 * Coding Club = club 1: event 1 = Tech Fest (100 rupees), event 3 = Intro to Git (free).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AnalyticsFlowTest {

	private static final long TECH_FEST = 1;

	private static final long GIT = 3;

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	@Autowired
	private EventRepository events;

	@Autowired
	private AnalyticsService analytics;

	@Autowired
	private CacheManager caches;

	@BeforeEach
	void emptyTheCache() {
		caches.getCache(AnalyticsService.CACHE).clear();
	}

	/** Books and returns { bookingId, ticketCode }. Free events are confirmed at once. */
	private String[] book(User student, long eventId, int quantity) throws Exception {
		String json = mvc.perform(post("/api/bookings").with(accounts.as(student)).contentType(MediaType.APPLICATION_JSON)
				.content("{\"eventId\": %d, \"quantity\": %d}".formatted(eventId, quantity)))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
		return new String[] { String.valueOf(JsonPath.<Number>read(json, "$.id")), JsonPath.read(json, "$.ticketCode") };
	}

	/** Pays with the built-in test gateway. */
	private void pay(User student, String bookingId) throws Exception {
		String json = mvc.perform(post("/api/bookings/" + bookingId + "/pay").with(accounts.as(student)))
			.andReturn().getResponse().getContentAsString();
		mvc.perform(post("/api/payments/fake/" + JsonPath.read(json, "$.sessionId") + "/complete").with(accounts.as(student)))
			.andExpect(jsonPath("$.status").value("CONFIRMED"));
	}

	private void scan(String ticketCode) throws Exception {
		mvc.perform(post("/api/gate/events/" + GIT + "/check-in").with(accounts.as(accounts.volunteerOf(1L)))
				.contentType(MediaType.APPLICATION_JSON).content("{\"code\": \"" + ticketCode + "\"}"))
			.andExpect(jsonPath("$.result").value("VALID"));
	}

	private void gitWasYesterday() {
		Event git = events.findById(GIT).orElseThrow();
		git.setStartTime(LocalDateTime.now().minusDays(1).withHour(14));
		git.setEndTime(LocalDateTime.now().minusDays(1).withHour(17));
		events.saveAndFlush(git);
	}

	private static DayPoint today(AnalyticsResponse r) {
		return r.perDay().getLast();
	}

	private static EventRow row(AnalyticsResponse r, long eventId) {
		return r.events().stream().filter(e -> e.eventId() == eventId).findFirst().orElseThrow();
	}

	@Test
	void countsTicketsMoneyCheckInsAndRatingsAndCachesTheAnswerFor60Seconds() throws Exception {
		AnalyticsResponse before = analytics.dashboard(1L, 30);
		assertThat(before.perDay()).hasSize(30);                        // every day, even days without sales
		assertThat(today(before).date()).isEqualTo(LocalDate.now());

		User ravi = accounts.student();
		pay(ravi, book(ravi, TECH_FEST, 2)[0]);                          // 2 x 100 rupees
		User asha = accounts.student();
		User bala = accounts.student();
		String[] ashaTicket = book(asha, GIT, 1);
		book(bala, GIT, 1);
		scan(ashaTicket[1]);                                             // Asha came, Bala did not
		gitWasYesterday();
		mvc.perform(put("/api/bookings/" + ashaTicket[0] + "/feedback").with(accounts.as(asha))
				.contentType(MediaType.APPLICATION_JSON).content("{\"rating\": 4}"))
			.andExpect(status().isOk());

		// within 60 s: the SAME saved answer, the database is not asked again
		assertThat(analytics.dashboard(1L, 30)).isSameAs(before);

		caches.getCache(AnalyticsService.CACHE).clear();                 // as if 60 s had passed
		AnalyticsResponse after = analytics.dashboard(1L, 30);
		assertThat(after).isNotSameAs(before);
		assertThat(after.totals().ticketsSold()).isEqualTo(before.totals().ticketsSold() + 4);
		assertThat(after.totals().revenue()).isEqualByComparingTo(before.totals().revenue().add(new BigDecimal("200")));
		assertThat(today(after).tickets()).isEqualTo(today(before).tickets() + 4);

		EventRow git = row(after, GIT);
		assertThat(git.started()).isTrue();
		assertThat(git.ticketsSold()).isEqualTo(2);
		assertThat(git.checkedIn()).isEqualTo(1);                        // 1 of 2 came = 50 %
		assertThat(git.averageRating()).isEqualTo(4.0);
		assertThat(after.totals().averageRating()).isEqualTo(4.0);
		assertThat(after.totals().checkInRate()).isEqualTo(0.5);

		EventRow techFest = row(after, TECH_FEST);
		assertThat(techFest.started()).isFalse();                        // gate not open yet: not in the check-in rate
		assertThat(techFest.revenue()).isEqualByComparingTo("200");

		// another club's numbers do not change
		assertThat(analytics.dashboard(2L, 30).totals().ticketsSold()).isZero();
	}

	@Test
	void onlyTheClubsOrganizersAndTheAdminSeeTheNumbers() throws Exception {
		mvc.perform(get("/api/organizer/clubs/1/analytics?days=7").with(accounts.as(accounts.organizerOf(1L))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.days").value(7))
			.andExpect(jsonPath("$.perDay.length()").value(7))
			.andExpect(jsonPath("$.totals.ticketsSold").isNumber());
		mvc.perform(get("/api/organizer/clubs/1/analytics").with(accounts.as(accounts.organizerOf(2L))))
			.andExpect(status().isForbidden());                          // another club's organizer
		mvc.perform(get("/api/organizer/clubs/1/analytics").with(accounts.as(accounts.volunteerOf(1L))))
			.andExpect(status().isForbidden());                          // volunteers scan, they do not see money
		mvc.perform(get("/api/admin/analytics").with(accounts.as(accounts.organizerOf(1L))))
			.andExpect(status().isForbidden());

		mvc.perform(get("/api/admin/analytics?days=90").with(accounts.as(accounts.admin())))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.perDay.length()").value(90));
		mvc.perform(get("/api/admin/analytics?days=0").with(accounts.as(accounts.admin())))
			.andExpect(status().isBadRequest());
	}

}
