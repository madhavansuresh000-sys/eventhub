package com.eventhub.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.user.UserRepository;

import jakarta.servlet.http.Cookie;

/** Phase 5 steps 1-4: register, login, logout, /me, the JWT cookie and CSRF. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private UserRepository users;

	@Autowired
	private TestAccounts accounts;

	@Autowired
	private JwtService jwtService;

	private static final String REGISTER = """
			{"fullName": "Anu Priya", "email": "Anu.Priya@College.EDU", "password": "secret123",
			 "department": "IT", "yearOfStudy": 2}
			""";

	private ResultActions postJson(String url, String json) throws Exception {
		return mvc.perform(post(url).with(TestAccounts.csrfToken()).contentType(MediaType.APPLICATION_JSON).content(json));
	}

	// ---------- step 1: register with BCrypt ----------

	@Test
	void registerCreatesStudentWithHashedPasswordAndLogsIn() throws Exception {
		postJson("/api/auth/register", REGISTER)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.email").value("anu.priya@college.edu")) // stored in lower case
			.andExpect(jsonPath("$.roles[0]").value("STUDENT"))
			.andExpect(jsonPath("$.department").value("IT"))
			.andExpect(jsonPath("$.password").doesNotExist())
			.andExpect(cookie().httpOnly(AuthCookies.NAME, true))
			.andExpect(header().string("Set-Cookie", containsString("SameSite=Lax")));

		String hash = users.findByEmail("anu.priya@college.edu").orElseThrow().getPasswordHash();
		assertThat(hash).startsWith("$2a$").isNotEqualTo("secret123"); // BCrypt, never the real password
	}

	@Test
	void sameEmailTwiceIs409() throws Exception {
		postJson("/api/auth/register", REGISTER).andExpect(status().isCreated());
		postJson("/api/auth/register", REGISTER.replace("Anu.Priya@College.EDU", "anu.priya@college.edu"))
			.andExpect(status().isConflict());
	}

	@Test
	void weakPasswordIs400() throws Exception {
		postJson("/api/auth/register", REGISTER.replace("secret123", "short"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.password").exists());
		postJson("/api/auth/register", REGISTER.replace("secret123", "onlyletters"))
			.andExpect(jsonPath("$.errors.password").value("password must contain a letter and a number"));
	}

	// ---------- step 2: login / logout with the cookie ----------

	@Test
	void loginSetsCookieAndMeWorksWithIt() throws Exception {
		String email = accounts.organizerOf(1L).getEmail();
		Cookie token = postJson("/api/auth/login", "{\"email\": \"%s\", \"password\": \"%s\"}".formatted(email, TestAccounts.PASSWORD))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.clubs[0].clubName").value("Coding Club"))
			.andExpect(jsonPath("$.clubs[0].role").value("ORGANIZER"))
			.andReturn().getResponse().getCookie(AuthCookies.NAME);
		assertThat(token).isNotNull();

		mvc.perform(get("/api/auth/me").cookie(token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(email));
	}

	@Test
	void wrongPasswordAndUnknownEmailGiveTheSame401() throws Exception {
		String email = accounts.student().getEmail();
		postJson("/api/auth/login", "{\"email\": \"%s\", \"password\": \"wrong-pass-1\"}".formatted(email))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.detail").value("Wrong email or password."));
		postJson("/api/auth/login", "{\"email\": \"nobody@example.com\", \"password\": \"wrong-pass-1\"}")
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.detail").value("Wrong email or password."));
	}

	@Test
	void logoutDeletesTheCookie() throws Exception {
		mvc.perform(post("/api/auth/logout").with(TestAccounts.csrfToken()))
			.andExpect(status().isNoContent())
			.andExpect(cookie().maxAge(AuthCookies.NAME, 0));
	}

	@Test
	void visitorGets204FromMe() throws Exception {
		mvc.perform(get("/api/auth/me")).andExpect(status().isNoContent());
	}

	// ---------- step 3: the JWT filter ----------

	@Test
	void fakeOrChangedTokenIsIgnored() throws Exception {
		mvc.perform(get("/api/auth/me").cookie(new Cookie(AuthCookies.NAME, "not-a-real-token")))
			.andExpect(status().isNoContent());

		// a real token with one letter of the signature changed: it no longer matches, so it is ignored
		String real = jwtService.issue(accounts.admin());
		char last = real.charAt(real.length() - 1);
		String changed = real.substring(0, real.length() - 1) + (last == 'A' ? 'B' : 'A');
		mvc.perform(get("/api/auth/me").cookie(new Cookie(AuthCookies.NAME, real)))
			.andExpect(status().isOk());
		mvc.perform(get("/api/auth/me").cookie(new Cookie(AuthCookies.NAME, changed)))
			.andExpect(status().isNoContent());
		mvc.perform(get("/api/admin/stats/clubs").cookie(new Cookie(AuthCookies.NAME, changed)))
			.andExpect(status().isUnauthorized());
	}

	// ---------- step 4: CSRF ----------

	@Test
	void postWithWrongCsrfTokenIs403() throws Exception {
		mvc.perform(post("/api/auth/logout").cookie(new Cookie("XSRF-TOKEN", "real-value"))
				.header("X-XSRF-TOKEN", "guessed-value"))
			.andExpect(status().isForbidden());
	}

	@Test
	void postWithoutCsrfTokenIs403() throws Exception {
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\": \"a@b.com\", \"password\": \"x1234567\"}"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.detail").value(containsString("CSRF")));
	}

	/** A logged-in request must not replace the CSRF token (it did once: every request looked like a new login). */
	@Test
	void csrfTokenStaysTheSameWhileLoggedIn() throws Exception {
		mvc.perform(get("/api/auth/me").with(accounts.as(accounts.student())))
			.andExpect(status().isOk())
			.andExpect(cookie().doesNotExist("XSRF-TOKEN"));
	}

	@Test
	void anyResponseGivesTheBrowserACsrfCookie() throws Exception {
		mvc.perform(get("/api/auth/me"))
			.andExpect(cookie().exists("XSRF-TOKEN"))
			.andExpect(cookie().httpOnly("XSRF-TOKEN", false)); // JavaScript must be able to read this one
	}

}
