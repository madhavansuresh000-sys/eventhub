package com.eventhub.event;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Calls the real URLs against the Flyway sample data. Changes are rolled back. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class EventControllerTest {

	@Autowired
	private MockMvc mvc;

	/** Phase 2 "done when" check: GET /api/events?tag=tech&page=0 returns the right events. */
	@Test
	void filterByTagFirstPage() throws Exception {
		mvc.perform(get("/api/events").param("tag", "tech").param("page", "0"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalElements").value(6))
			.andExpect(jsonPath("$.page").value(0))
			.andExpect(jsonPath("$.content[0].title").value("Intro to Git and GitHub"))
			.andExpect(jsonPath("$.content[*].tags", everyItem(hasItem("tech"))))
			.andExpect(jsonPath("$.content[*].status", everyItem(org.hamcrest.Matchers.is("PUBLISHED"))));
	}

	@Test
	void pagesSplitTheResults() throws Exception {
		mvc.perform(get("/api/events").param("tag", "tech").param("size", "4").param("page", "1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalPages").value(2))
			.andExpect(jsonPath("$.content.length()").value(2))
			.andExpect(jsonPath("$.last").value(true));
	}

	@Test
	void onlyPublishedEventsAreListed() throws Exception {
		mvc.perform(get("/api/events").param("size", "50"))
			.andExpect(jsonPath("$.totalElements").value(16));
	}

	@Test
	void filterByClubTextAndDates() throws Exception {
		mvc.perform(get("/api/events").param("club", "robotics-club"))
			.andExpect(jsonPath("$.totalElements").value(2));
		mvc.perform(get("/api/events").param("q", "HACKATHON"))
			.andExpect(jsonPath("$.totalElements").value(1))
			.andExpect(jsonPath("$.content[0].title").value("24-Hour Hackathon"));
		mvc.perform(get("/api/events").param("from", "2026-10-01").param("to", "2026-10-31").param("size", "50"))
			.andExpect(jsonPath("$.totalElements").value(11));
	}

	@Test
	void sortByPriceDescending() throws Exception {
		mvc.perform(get("/api/events").param("sort", "price").param("dir", "desc"))
			.andExpect(jsonPath("$.content[0].price").value(150.00))
			.andExpect(jsonPath("$.content[0].title").value("24-Hour Hackathon"));
	}

	@Test
	void soldOutFlagForFullEvent() throws Exception {
		mvc.perform(get("/api/events").param("q", "Dance Night"))
			.andExpect(jsonPath("$.content[0].soldOut").value(true));
	}

	@Test
	void getOnePublishedEvent() throws Exception {
		mvc.perform(get("/api/events/1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.title").value("Tech Fest 2026"))
			.andExpect(jsonPath("$.club.slug").value("coding-club"))
			.andExpect(jsonPath("$.tags[0]").value("coding"));
	}

	@Test
	void createReturns201WithLocation() throws Exception {
		String start = LocalDateTime.now().plusDays(20).withNano(0).toString();
		String end = LocalDateTime.now().plusDays(20).plusHours(2).withNano(0).toString();
		String body = """
				{"clubId": 1, "title": "Kotlin Meetup", "description": "Intro to Kotlin",
				 "venue": "Seminar Hall A", "startTime": "%s", "endTime": "%s",
				 "totalSeats": 40, "price": 0, "tags": ["tech", "coding"]}
				""".formatted(start, end);

		mvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isCreated())
			.andExpect(header().string("Location", startsWith("/api/events/")))
			.andExpect(jsonPath("$.status").value("DRAFT"))
			.andExpect(jsonPath("$.availableSeats").value(40));
	}

	/** Phase 2 "done when" check: submitting and approving an event changes its status correctly. */
	@Test
	void submitAndApproveFlow() throws Exception {
		// id 5 is a DRAFT, so it is hidden from the public list
		mvc.perform(get("/api/events").param("q", "Bootcamp"))
			.andExpect(jsonPath("$.totalElements").value(0));

		mvc.perform(post("/api/events/5/submit"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));

		mvc.perform(post("/api/events/5/approve"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("PUBLISHED"));

		// now students can find it
		mvc.perform(get("/api/events").param("q", "Bootcamp"))
			.andExpect(jsonPath("$.totalElements").value(1));
		mvc.perform(get("/api/events/5"))
			.andExpect(status().isOk());
	}

	@Test
	void rejectFlow() throws Exception {
		mvc.perform(post("/api/events/17/reject").contentType(MediaType.APPLICATION_JSON)
				.content("{\"reason\": \"Add safety instructions for the drone flight\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("DRAFT"))
			.andExpect(jsonPath("$.reviewNote").value("Add safety instructions for the drone flight"));
	}

	@Test
	void clubsAndTagsForFilters() throws Exception {
		mvc.perform(get("/api/clubs"))
			.andExpect(jsonPath("$.length()").value(5))
			.andExpect(jsonPath("$[0].name").value("Career Cell"));
		mvc.perform(get("/api/tags"))
			.andExpect(jsonPath("$.length()").value(10))
			.andExpect(jsonPath("$[0]").value("arts"));
	}

}
