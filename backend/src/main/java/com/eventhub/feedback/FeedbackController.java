package com.eventhub.feedback;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.auth.CurrentUser;
import com.eventhub.feedback.dto.EventFeedbackResponse;
import com.eventhub.feedback.dto.FeedbackRequest;
import com.eventhub.feedback.dto.MyFeedbackResponse;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class FeedbackController {

	private final FeedbackService service;

	/** The events I attended, with my rating (or null = not rated yet). */
	@GetMapping("/api/feedback/mine")
	public List<MyFeedbackResponse> mine(@AuthenticationPrincipal CurrentUser user) {
		return service.mine(user.id());
	}

	/** Give or change my rating. PUT = "set it to this" - sending it twice gives the same result. */
	@PutMapping("/api/bookings/{bookingId}/feedback")
	public MyFeedbackResponse give(@AuthenticationPrincipal CurrentUser user, @PathVariable Long bookingId,
			@Valid @RequestBody FeedbackRequest request) {
		return service.give(user.id(), bookingId, request);
	}

	/** Organizers of the event's club: average, stars, anonymous comments. */
	@GetMapping("/api/organizer/events/{eventId}/feedback")
	@PreAuthorize("@clubAccess.canManageEvent(#eventId)")
	public EventFeedbackResponse forEvent(@PathVariable Long eventId) {
		return service.forEvent(eventId);
	}

}
