package com.eventhub.audit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import com.eventhub.user.User;

/** Phase 5 step 8: every workflow step is written to the audit log with WHO did it. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuditLogTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	@Test
	void submitApproveAndRejectAreLoggedWithTheirUser() throws Exception {
		User organizer = accounts.organizerOf(1L);
		User admin = accounts.admin();

		mvc.perform(post("/api/events/5/submit").with(accounts.as(organizer))).andExpect(status().isOk());
		mvc.perform(post("/api/events/5/approve").with(accounts.as(admin))).andExpect(status().isOk());
		mvc.perform(post("/api/events/9/reject").with(accounts.as(admin))
				.contentType(MediaType.APPLICATION_JSON).content("{\"reason\": \"Add the stage plan\"}"))
			.andExpect(status().isOk());

		mvc.perform(get("/api/admin/audit").with(accounts.as(admin)))
			.andExpect(status().isOk())
			// newest first
			.andExpect(jsonPath("$.content[0].action").value("REJECT"))
			.andExpect(jsonPath("$.content[0].eventTitle").value("Street Play Festival"))
			.andExpect(jsonPath("$.content[0].details").value("Add the stage plan"))
			.andExpect(jsonPath("$.content[0].userEmail").value(admin.getEmail()))
			.andExpect(jsonPath("$.content[1].action").value("APPROVE"))
			.andExpect(jsonPath("$.content[2].action").value("SUBMIT"))
			.andExpect(jsonPath("$.content[2].userEmail").value(organizer.getEmail()));
	}

	@Test
	void onlyAdminsCanReadTheLog() throws Exception {
		mvc.perform(get("/api/admin/audit").with(accounts.as(accounts.organizerOf(1L))))
			.andExpect(status().isForbidden());
	}

}
