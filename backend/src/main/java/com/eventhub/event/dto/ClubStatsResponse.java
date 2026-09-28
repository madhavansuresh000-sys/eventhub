package com.eventhub.event.dto;

import java.math.BigDecimal;

/**
 * One row of the admin overview: how a club is doing.
 * Seats sold = totalSeats - availableSeats of its PUBLISHED events (real bookings arrive in Phase 6).
 */
public record ClubStatsResponse(
		Long clubId,
		String clubName,
		String clubSlug,
		long published,
		long pending,
		long seatsSold,
		BigDecimal revenue) {
}
