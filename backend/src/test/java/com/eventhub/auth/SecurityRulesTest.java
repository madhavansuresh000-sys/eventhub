package com.eventhub.auth;

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
import org.springframework.transaction.annotation.Transactional;

/**
 * Phase 5 steps 5-6: who may do what.
 * Club 1 = Coding Club, club 2 = Cultural Club. Event 5 = Coding Club draft, event 6 = Cultural Club (Dance Night).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SecurityRulesTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	private static String eventJson(long clubId, String title) {
		String start = LocalDateTime.now().plusDays(25).withNano(0).toString();
		String end = LocalDateTime.now().plusDays(25).plusHours(3).withNano(0).toString();
		return """
				{"clubId": %d, "title": "%s", "venue": "Open Air Theatre", "startTime": "%s", "endTime": "%s",
				 "totalSeats": 300, "price": 50, "tags": ["dance"]}
				""".formatted(clubId, title, start, end);
	}

	// ---------- Phase 5 "done when" #1 ----------

	@Test
	void studentGets403OnAdminApisAdminGets200() throws Exception {
		mvc.perform(get("/api/admin/stats/clubs").with(accounts.as(accounts.student())))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.detail").value("You do not have permission to do this."));
		mvc.perform(post("/api/events/9/approve").with(accounts.as(accounts.student())))
			.andExpect(status().isForbidden());

		mvc.perform(get("/api/admin/stats/clubs").with(accounts.as(accounts.admin())))
			.andExpect(status().isOk());
		mvc.perform(post("/api/events/9/approve").with(accounts.as(accounts.admin())))
			.andExpect(status().isOk());
	}

	// ---------- Phase 5 "done when" #2 ----------

	@Test
	void codingClubOrganizerCannotEditCulturalClubEvents() throws Exception {
		var codingOrganizer = accounts.organizerOf(1L);

		// edit Dance Night (Cultural Club)
		mvc.perform(put("/api/events/6").with(accounts.as(codingOrganizer))
				.contentType(MediaType.APPLICATION_JSON).content(eventJson(2, "Dance Night")))
			.andExpect(status().isForbidden());
		// nor create an event for the Cultural Club
		mvc.perform(post("/api/events").with(accounts.as(codingOrganizer))
				.contentType(MediaType.APPLICATION_JSON).content(eventJson(2, "Fake Dance Show")))
			.andExpect(status().isForbidden());
		// nor move one of its own events into the Cultural Club
		mvc.perform(put("/api/events/5").with(accounts.as(codingOrganizer))
				.contentType(MediaType.APPLICATION_JSON).content(eventJson(2, "Spring Boot Bootcamp")))
			.andExpect(status().isForbidden());
		// nor see the Cultural Club's drafts
		mvc.perform(get("/api/organizer/clubs/2/events").with(accounts.as(codingOrganizer)))
			.andExpect(status().isForbidden());

		// but the Cultural Club's own organizer can
		mvc.perform(put("/api/events/6").with(accounts.as(accounts.organizerOf(2L)))
				.contentType(MediaType.APPLICATION_JSON).content(eventJson(2, "Dance Night")))
			.andExpect(status().isOk());
	}

	// ---------- other roles ----------

	@Test
	void visitorMustLogInButCanStillBrowse() throws Exception {
		mvc.perform(get("/api/events")).andExpect(status().isOk());
		mvc.perform(get("/api/admin/events/pending"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.detail").value("Please log in first."));
		mvc.perform(get("/api/organizer/clubs/1/events")).andExpect(status().isUnauthorized());
	}

	@Test
	void volunteerAndPlainStudentCannotManageEvents() throws Exception {
		mvc.perform(post("/api/events/5/submit").with(accounts.as(accounts.volunteerOf(1L))))
			.andExpect(status().isForbidden());
		mvc.perform(post("/api/events").with(accounts.as(accounts.student()))
				.contentType(MediaType.APPLICATION_JSON).content(eventJson(1, "My Own Event")))
			.andExpect(status().isForbidden());
	}

	@Test
	void adminIsNotAutomaticallyAnOrganizer() throws Exception {
		// admins review events; clubs create them
		mvc.perform(post("/api/events").with(accounts.as(accounts.admin()))
				.contentType(MediaType.APPLICATION_JSON).content(eventJson(1, "Admin Event")))
			.andExpect(status().isForbidden());
	}

}
