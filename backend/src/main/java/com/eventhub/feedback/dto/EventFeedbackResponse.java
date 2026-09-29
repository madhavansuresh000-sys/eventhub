package com.eventhub.feedback.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * What the organizer sees about one event. NO names: comments are anonymous.
 * stars[0] = how many gave 1 star ... stars[4] = how many gave 5 stars.
 */
public record EventFeedbackResponse(Long eventId, String eventTitle, long count, Double average, long[] stars,
		long attended, List<Comment> comments) {

	public record Comment(int rating, String comment, LocalDateTime createdAt) {
	}

}
