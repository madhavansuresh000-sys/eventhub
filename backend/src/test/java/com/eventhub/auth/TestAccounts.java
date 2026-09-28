package com.eventhub.auth;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.eventhub.club.ClubMember;
import com.eventhub.club.ClubMemberRepository;
import com.eventhub.club.ClubRepository;
import com.eventhub.club.ClubRole;
import com.eventhub.user.RoleRepository;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;

import jakarta.servlet.http.Cookie;

/**
 * Test helper: makes users with any role and "logs them in" with a REAL JWT cookie,
 * so tests go through the real JwtCookieFilter and security rules.
 *   mvc.perform(post("/api/events/5/submit").with(accounts.as(accounts.organizerOf(1L))))
 * Tests are @Transactional, so these users disappear after each test.
 */
@Component
public class TestAccounts {

	public static final String PASSWORD = "Test-pass-123";

	@Autowired
	private UserRepository users;

	@Autowired
	private RoleRepository roles;

	@Autowired
	private ClubRepository clubs;

	@Autowired
	private ClubMemberRepository members;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private JwtService jwtService;

	public User student() {
		return create(AuthService.STUDENT, null, null);
	}

	public User admin() {
		return create(AuthService.ADMIN, null, null);
	}

	public User organizerOf(Long clubId) {
		return create(AuthService.STUDENT, clubId, ClubRole.ORGANIZER);
	}

	public User volunteerOf(Long clubId) {
		return create(AuthService.STUDENT, clubId, ClubRole.VOLUNTEER);
	}

	/** Adds the user's login cookie and a valid CSRF token to a MockMvc request. */
	public RequestPostProcessor as(User user) {
		Cookie login = new Cookie(AuthCookies.NAME, jwtService.issue(user));
		String csrf = UUID.randomUUID().toString();
		return request -> {
			request.setCookies(login, new Cookie("XSRF-TOKEN", csrf));
			request.addHeader("X-XSRF-TOKEN", csrf);
			return request;
		};
	}

	/**
	 * What the browser does: the same random value in the XSRF-TOKEN cookie and the X-XSRF-TOKEN header
	 * ("double-submit cookie"). Another website can make the browser send our cookie, but cannot READ it,
	 * so it cannot put the matching value in the header.
	 * (Spring's own csrf() test helper is not used: it swaps the token storage for every later test.)
	 */
	public static RequestPostProcessor csrfToken() {
		String csrf = UUID.randomUUID().toString();
		return request -> {
			request.setCookies(new Cookie("XSRF-TOKEN", csrf));
			request.addHeader("X-XSRF-TOKEN", csrf);
			return request;
		};
	}

	private User create(String role, Long clubId, ClubRole clubRole) {
		User user = new User();
		user.setEmail("test-" + UUID.randomUUID() + "@example.com");
		user.setFullName("Test " + role);
		user.setPasswordHash(passwordEncoder.encode(PASSWORD));
		user.getRoles().add(roles.findByName(role).orElseThrow());
		users.save(user);
		if (clubId != null) {
			ClubMember member = new ClubMember();
			member.setUser(user);
			member.setClub(clubs.getReferenceById(clubId));
			member.setClubRole(clubRole);
			members.save(member);
		}
		return user;
	}

}
