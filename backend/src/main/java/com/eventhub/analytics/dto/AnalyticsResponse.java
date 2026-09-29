package com.eventhub.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * The analytics dashboard of one club (organizer) or of all clubs (admin), for the last `days` days.
 *
 * @param generatedAt when these numbers were counted - they are cached, so they can be up to 60 s old
 * @param perDay      one point per day from `from` to `to`, days without sales included (0)
 * @param events      published events starting on or after `from` (recent and upcoming), soonest first
 */
public record AnalyticsResponse(
		LocalDate from,
		LocalDate to,
		int days,
		LocalDateTime generatedAt,
		Totals totals,
		List<DayPoint> perDay,
		List<EventRow> events) {

	/**
	 * @param ticketsSold    tickets paid in the period (bookings still valid, not cancelled)
	 * @param revenue        money of those tickets
	 * @param checkedIn      tickets scanned at the gate, for events that have already started
	 * @param expectedAtGate tickets sold for those same started events
	 * @param checkInRate    checkedIn / expectedAtGate, 0..1 (null = no started event with tickets yet)
	 * @param averageRating  average stars of the events in the list (null = no ratings yet)
	 */
	public record Totals(long ticketsSold, BigDecimal revenue, long checkedIn, long expectedAtGate,
			Double checkInRate, Double averageRating, long ratings) {
	}

	public record DayPoint(LocalDate date, long tickets, BigDecimal revenue) {
	}

	/** started = the gate is open or closed; before that, checkedIn is always 0 and means nothing. */
	public record EventRow(Long eventId, String title, LocalDateTime startTime, boolean started, int totalSeats,
			long ticketsSold, long checkedIn, BigDecimal revenue, Double averageRating, long ratings) {
	}

}
