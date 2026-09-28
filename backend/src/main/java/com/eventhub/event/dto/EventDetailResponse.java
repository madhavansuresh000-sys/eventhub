package com.eventhub.event.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.eventhub.club.dto.ClubResponse;
import com.eventhub.event.EventStatus;

/** Everything shown on the Event details page. */
public record EventDetailResponse(
		Long id,
		String title,
		String description,
		ClubResponse club,
		String venue,
		LocalDateTime startTime,
		LocalDateTime endTime,
		int availableSeats,
		int totalSeats,
		boolean soldOut,
		BigDecimal price,
		EventStatus status,
		String reviewNote,
		List<String> tags) {
}
