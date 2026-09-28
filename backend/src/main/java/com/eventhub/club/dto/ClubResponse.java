package com.eventhub.club.dto;

import com.eventhub.club.Club;

public record ClubResponse(Long id, String name, String slug, String description) {

	public static ClubResponse from(Club club) {
		return new ClubResponse(club.getId(), club.getName(), club.getSlug(), club.getDescription());
	}

}
