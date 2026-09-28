package com.eventhub.auth;

import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * The logged-in person, as read from the JWT cookie on each request.
 * Controllers can ask for it with @AuthenticationPrincipal CurrentUser user.
 */
public record CurrentUser(Long id, String email, String fullName) {

	/** The user of the current request, or empty for a visitor who is not logged in. */
	public static Optional<CurrentUser> get() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth != null && auth.getPrincipal() instanceof CurrentUser user) {
			return Optional.of(user);
		}
		return Optional.empty();
	}

}
