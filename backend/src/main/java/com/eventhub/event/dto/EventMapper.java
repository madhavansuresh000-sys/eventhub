package com.eventhub.event.dto;

import java.util.List;

import com.eventhub.club.dto.ClubResponse;
import com.eventhub.event.Event;
import com.eventhub.tag.Tag;

/** Copies an Event entity into a DTO ("packs the shipping box"). */
public final class EventMapper {

	private EventMapper() {
	}

	public static EventSummaryResponse toSummary(Event e) {
		return new EventSummaryResponse(
				e.getId(),
				e.getTitle(),
				e.getClub().getName(),
				e.getClub().getSlug(),
				e.getVenue(),
				e.getStartTime(),
				e.getAvailableSeats(),
				e.getTotalSeats(),
				e.getAvailableSeats() == 0,
				e.getPrice(),
				e.getStatus(),
				tagNames(e));
	}

	public static EventDetailResponse toDetail(Event e) {
		return new EventDetailResponse(
				e.getId(),
				e.getTitle(),
				e.getDescription(),
				ClubResponse.from(e.getClub()),
				e.getVenue(),
				e.getStartTime(),
				e.getEndTime(),
				e.getAvailableSeats(),
				e.getTotalSeats(),
				e.getAvailableSeats() == 0,
				e.getPrice(),
				e.getStatus(),
				e.getReviewNote(),
				tagNames(e));
	}

	/** Tag names sorted A-Z so the order is always the same. */
	private static List<String> tagNames(Event e) {
		return e.getTags().stream().map(Tag::getName).sorted().toList();
	}

}
