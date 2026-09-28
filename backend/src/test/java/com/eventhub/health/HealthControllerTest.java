package com.eventhub.health;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import com.eventhub.auth.JwtService;
import com.eventhub.config.SecurityConfig;

@WebMvcTest(HealthController.class)
@Import({ SecurityConfig.class, JwtService.class })
class HealthControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void healthIsPublicAndUp() throws Exception {
		mockMvc.perform(get("/api/health"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("UP"));
	}

	@Test
	void otherUrlsNeedLogin() throws Exception {
		// /api/admin/** is temporarily open in Phase 4; bookings stay locked
		mockMvc.perform(get("/api/bookings"))
			.andExpect(status().isUnauthorized());
	}

}
