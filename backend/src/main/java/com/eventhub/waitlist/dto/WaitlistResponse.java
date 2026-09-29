package com.eventhub.waitlist.dto;

import java.time.Duration;
import java.time.LocalDateTime;

import com.eventhub.booking.dto.BookingResponse.EventInfo;
import com.eventhub.waitlist.WaitlistEntry;
import com.eventhub.waitlist.WaitlistStatus;

/**
 * A waitlist place as the student sees it.
 * position: 1 = next in line (only while WAITING). secondsLeft: time left to accept an offer (server clock).
 */
public record WaitlistResponse(
		Long id,
		WaitlistStatus status,
		int quantity,
		Integer position,
		LocalDateTime offerExpiresAt,
		long secondsLeft,
		Long bookingId,
		LocalDateTime createdAt,
		LocalDateTime closedAt,
		EventInfo event) {

	public static WaitlistResponse from(WaitlistEntry w, Integer position, LocalDateTime now) {
		long secondsLeft = w.getStatus() == WaitlistStatus.OFFERED && w.getOfferExpiresAt() != null
				? Math.max(0, Duration.between(now, w.getOfferExpiresAt()).toSeconds())
				: 0;
		return new WaitlistResponse(w.getId(), w.getStatus(), w.getQuantity(), position, w.getOfferExpiresAt(),
				secondsLeft, w.getBooking() == null ? null : w.getBooking().getId(), w.getCreatedAt(), w.getClosedAt(),
				EventInfo.of(w.getEvent()));
	}

}
