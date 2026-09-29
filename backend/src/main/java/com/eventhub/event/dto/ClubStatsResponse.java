package com.eventhub.event.dto;

import java.math.BigDecimal;

/**
 * One row of the admin overview: how a club is doing.
 * Seats sold = totalSeats - availableSeats of its PUBLISHED events (seats held for checkout count too).
 * Money here is seats x today's price - a quick estimate; the exact paid amounts are in /api/admin/analytics.
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
