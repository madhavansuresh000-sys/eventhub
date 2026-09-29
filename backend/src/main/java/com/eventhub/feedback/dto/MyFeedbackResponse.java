package com.eventhub.feedback.dto;

import java.time.LocalDateTime;

/**
 * One event I attended, with my rating (null = not rated yet).
 * The "Rate this event" list on My tickets.
 */
public record MyFeedbackResponse(Long bookingId, Long eventId, String eventTitle, LocalDateTime eventStart,
		Integer rating, String comment) {
}
