package com.eventhub.event;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.auth.TestAccounts;

/** Phase 4: the organizer and admin URLs, and CORS. Uses the Flyway sample data; changes are rolled back. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OrganizerAdminControllerTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	// ---------- organizer ----------

	@Test
	void organizerSeesDraftsTooSoonestFirst() throws Exception {
		mvc.perform(get("/api/organizer/clubs/1/events").with(accounts.as(accounts.organizerOf(1L))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(5))
			.andExpect(jsonPath("$[0].title").value("Intro to Git and GitHub"))
			.andExpect(jsonPath("$[*].status", hasItem("DRAFT")))
			.andExpect(jsonPath("$[0].tags").isArray());
	}

	@Test
	void unknownClubIs403() throws Exception {
		// not an organizer of club 999 (it does not even exist): refused before looking
		mvc.perform(get("/api/organizer/clubs/999/events").with(accounts.as(accounts.organizerOf(1L))))
			.andExpect(status().isForbidden());
	}

	@Test
	void draftIsHiddenFromThePublicButNotFromTheOrganizer() throws Exception {
		mvc.perform(get("/api/events/5")).andExpect(status().isNotFound());
		mvc.perform(get("/api/organizer/events/5").with(accounts.as(accounts.organizerOf(1L))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("DRAFT"))
			.andExpect(jsonPath("$.club.id").value(1));
	}

	// ---------- admin ----------

	@Test
	void pendingQueueSoonestFirst() throws Exception {
		mvc.perform(get("/api/admin/events/pending").with(accounts.as(accounts.admin())))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0].title").value("Street Play Festival"))
			.andExpect(jsonPath("$[0].club.name").value("Cultural Club"))
			.andExpect(jsonPath("$[1].title").value("Drone Building Workshop"));
	}

	@Test
	void approvingRemovesTheEventFromTheQueue() throws Exception {
		mvc.perform(post("/api/events/9/approve").with(accounts.as(accounts.admin()))).andExpect(status().isOk());
		mvc.perform(get("/api/admin/events/pending").with(accounts.as(accounts.admin())))
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].id").value(17));
	}

	@Test
	void clubStatsOneRowPerClub() throws Exception {
		mvc.perform(get("/api/admin/stats/clubs").with(accounts.as(accounts.admin())))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(5))
			.andExpect(jsonPath("$[0].clubName").value("Coding Club"))
			.andExpect(jsonPath("$[0].published").value(4))
			.andExpect(jsonPath("$[0].pending").value(0))
			.andExpect(jsonPath("$[0].seatsSold").value(353))
			.andExpect(jsonPath("$[0].revenue").value(34750.00))
			.andExpect(jsonPath("$[1].pending").value(1))
			.andExpect(jsonPath("$[4].revenue").value(0));
	}

	// ---------- CORS ----------

	/** The browser first asks "may localhost:5173 POST here?" (a preflight OPTIONS request). */
	@Test
	void reactAddressIsAllowed() throws Exception {
		mvc.perform(options("/api/events/1/submit")
				.header("Origin", "http://localhost:5173")
				.header("Access-Control-Request-Method", "POST")
				.contentType(MediaType.APPLICATION_JSON))
			.andExpect(status().isOk())
			.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
	}

	@Test
	void otherWebsitesAreBlocked() throws Exception {
		mvc.perform(options("/api/events")
				.header("Origin", "https://evil.example.com")
				.header("Access-Control-Request-Method", "GET"))
			.andExpect(status().isForbidden());
	}

}
