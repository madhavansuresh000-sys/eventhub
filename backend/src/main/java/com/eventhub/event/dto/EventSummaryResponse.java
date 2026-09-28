package com.eventhub.event.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.eventhub.event.EventStatus;

/** One event card in a list (Home page). Only what the card needs. */
public record EventSummaryResponse(
		Long id,
		String title,
		String clubName,
		String clubSlug,
		String venue,
		LocalDateTime startTime,
		int availableSeats,
		int totalSeats,
		boolean soldOut,
		BigDecimal price,
		EventStatus status,
		List<String> tags) {
}
