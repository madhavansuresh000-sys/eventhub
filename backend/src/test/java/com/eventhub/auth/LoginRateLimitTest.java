package com.eventhub.auth;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/** Phase 5 step 9: password guessing is stopped after 5 wrong tries. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LoginRateLimitTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TestAccounts accounts;

	private ResultActions login(String email, String password) throws Exception {
		return mvc.perform(post("/api/auth/login").with(TestAccounts.csrfToken())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\": \"%s\", \"password\": \"%s\"}".formatted(email, password)));
	}

	@Test
	void fifthWrongPasswordLocksEvenTheRightOne() throws Exception {
		String email = accounts.student().getEmail();
		for (int i = 1; i <= 5; i++) {
			login(email, "guess-" + i).andExpect(status().isUnauthorized());
		}
		login(email, TestAccounts.PASSWORD)
			.andExpect(status().isTooManyRequests())
			.andExpect(header().exists("Retry-After"))
			.andExpect(jsonPath("$.detail").value("Too many wrong passwords. Please wait 15 minutes and try again."));
	}

	@Test
	void rightPasswordResetsTheCount() throws Exception {
		String email = accounts.student().getEmail();
		for (int i = 1; i <= 4; i++) {
			login(email, "guess-" + i).andExpect(status().isUnauthorized());
		}
		login(email, TestAccounts.PASSWORD).andExpect(status().isOk());
		login(email, "guess-5").andExpect(status().isUnauthorized()); // counting starts again, no lock
		login(email, TestAccounts.PASSWORD).andExpect(status().isOk());
	}

	/** A clock we can move forward, so the test does not have to wait 15 real minutes. */
	private static final class MovableClock extends Clock {

		private Instant now = Instant.parse("2026-10-01T10:00:00Z");

		void forward(Duration d) {
			now = now.plus(d);
		}

		@Override
		public Instant instant() {
			return now;
		}

		@Override
		public ZoneId getZone() {
			return ZoneId.of("UTC");
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

	}

	@Test
	void lockEndsAfterTheLockTime() {
		MovableClock clock = new MovableClock();
		LoginAttemptService service = new LoginAttemptService(5, Duration.ofMinutes(15), clock);
		for (int i = 0; i < 5; i++) {
			service.failed("ravi@college.edu", "10.0.0.7");
		}
		assertThatThrownBy(() -> service.checkAllowed("ravi@college.edu", "10.0.0.7"))
			.isInstanceOf(TooManyLoginAttemptsException.class);
		// someone else on another computer is not affected
		assertThatNoException().isThrownBy(() -> service.checkAllowed("ravi@college.edu", "10.0.0.8"));

		clock.forward(Duration.ofMinutes(14));
		assertThatThrownBy(() -> service.checkAllowed("ravi@college.edu", "10.0.0.7"))
			.hasMessage("Too many wrong passwords. Please wait 1 minute and try again.");
		clock.forward(Duration.ofMinutes(1));
		assertThatNoException().isThrownBy(() -> service.checkAllowed("ravi@college.edu", "10.0.0.7"));
	}

}
