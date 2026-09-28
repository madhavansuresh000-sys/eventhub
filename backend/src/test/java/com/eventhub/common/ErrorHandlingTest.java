package com.eventhub.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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

/** Every kind of mistake gets a clean JSON answer with the right status code. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ErrorHandlingTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	private ResultActions postJson(String url, String json) throws Exception {
		// logged in as an organizer of the Coding Club (club 1), so only the input can be wrong
		return mvc.perform(post(url).with(accounts.as(accounts.organizerOf(1L)))
			.contentType(MediaType.APPLICATION_JSON).content(json));
	}

	/** Phase 2 "done when" check: wrong input returns a 400 error with a clear message. */
	@Test
	void missingFieldsGive400WithEveryFieldListed() throws Exception {
		postJson("/api/events", "{}")
			.andExpect(status().isBadRequest())
			.andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.detail").value("Validation failed"))
			.andExpect(jsonPath("$.errors.clubId").value("clubId is required"))
			.andExpect(jsonPath("$.errors.title").value("title is required"))
			.andExpect(jsonPath("$.errors.venue").value("venue is required"))
			.andExpect(jsonPath("$.errors.startTime").value("startTime is required"))
			.andExpect(jsonPath("$.errors.totalSeats").value("totalSeats is required"))
			.andExpect(jsonPath("$.errors.price").value("price is required"));
	}

	@Test
	void pastStartTimeAndNegativePrice() throws Exception {
		String yesterday = LocalDateTime.now().minusDays(1).withNano(0).toString();
		postJson("/api/events", """
				{"clubId": 1, "title": "Old", "venue": "Hall", "startTime": "%s", "endTime": "%s",
				 "totalSeats": 0, "price": -5}
				""".formatted(yesterday, yesterday))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.totalSeats").value("totalSeats must be at least 1"))
			.andExpect(jsonPath("$.errors.startTime").value("startTime must be in the future"))
			.andExpect(jsonPath("$.errors.price").value("price cannot be negative"));
	}

	@Test
	void endBeforeStartIs400() throws Exception {
		LocalDateTime start = LocalDateTime.now().plusDays(5).withNano(0);
		postJson("/api/events", """
				{"clubId": 1, "title": "T", "venue": "Hall", "startTime": "%s", "endTime": "%s",
				 "totalSeats": 10, "price": 0}
				""".formatted(start, start.minusHours(1)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("endTime must be after startTime"));
	}

	@Test
	void brokenJsonIs400() throws Exception {
		postJson("/api/events", "{ this is not json")
			.andExpect(status().isBadRequest())
			.andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON));
	}

	@Test
	void wrongQueryValuesAre400() throws Exception {
		mvc.perform(get("/api/events").param("page", "abc"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("Invalid value 'abc' for 'page'"));
		mvc.perform(get("/api/events").param("from", "31-10-2026"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("Invalid value '31-10-2026' for 'from'"));
		mvc.perform(get("/api/events").param("sort", "colour"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("sort must be one of: date, price, title"));
		mvc.perform(get("/api/events").param("size", "500"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("size must be between 1 and 50"));
	}

	@Test
	void missingOrHiddenEventIs404() throws Exception {
		mvc.perform(get("/api/events/999"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.detail").value("Event 999 not found"));
		// id 5 is a DRAFT: hidden from the public
		mvc.perform(get("/api/events/5"))
			.andExpect(status().isNotFound());
		mvc.perform(get("/api/clubs/no-such-club"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.detail").value("Club no-such-club not found"));
	}

	@Test
	void illegalWorkflowMoveIs409() throws Exception {
		mvc.perform(post("/api/events/5/approve").with(accounts.as(accounts.admin())))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value("Cannot approve event 5: it is DRAFT (allowed next: [PENDING_APPROVAL])"));
	}

	@Test
	void rejectWithoutReasonIs400() throws Exception {
		mvc.perform(post("/api/events/9/reject").with(accounts.as(accounts.admin()))
				.contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.reason").value("reason is required"));
	}

}
