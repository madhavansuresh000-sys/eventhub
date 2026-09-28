package com.eventhub.auth.dto;

import java.util.List;

/**
 * Everything the React app needs to know about the logged-in user:
 * global roles (STUDENT, ADMIN) and the clubs they help run (ORGANIZER / VOLUNTEER per club).
 * The password hash is never sent.
 */
public record MeResponse(
		Long id,
		String fullName,
		String email,
		String department,
		Integer yearOfStudy,
		List<String> roles,
		List<Membership> clubs) {

	/** e.g. { clubId: 1, clubName: "Coding Club", clubSlug: "coding-club", role: "ORGANIZER" } */
	public record Membership(Long clubId, String clubName, String clubSlug, String role) {
	}

}
