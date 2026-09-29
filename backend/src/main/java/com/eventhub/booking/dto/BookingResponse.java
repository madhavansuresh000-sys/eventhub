package com.eventhub.booking.dto;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import com.eventhub.booking.Booking;
import com.eventhub.booking.BookingStatus;
import com.eventhub.event.Event;
import com.eventhub.tag.Tag;

/**
 * A booking as the student sees it (My tickets, checkout timer, QR ticket).
 * secondsLeft is counted by the SERVER, so a wrong clock on the student's phone cannot change the timer.
 */
public record BookingResponse(
		Long id,
		BookingStatus status,
		int quantity,
		BigDecimal amount,
		String ticketCode,
		LocalDateTime holdExpiresAt,
		long secondsLeft,
		LocalDateTime createdAt,
		LocalDateTime confirmedAt,
		LocalDateTime cancelledAt,
		boolean canCancel,
		EventInfo event) {

	public record EventInfo(Long id, String title, String venue, LocalDateTime startTime, LocalDateTime endTime,
			BigDecimal price, String clubName, String clubSlug, List<String> tags) {

		public static EventInfo of(Event e) {
			return new EventInfo(e.getId(), e.getTitle(), e.getVenue(), e.getStartTime(), e.getEndTime(), e.getPrice(),
					e.getClub().getName(), e.getClub().getSlug(),
					e.getTags().stream().map(Tag::getName).sorted().toList());
		}
	}

	public static BookingResponse from(Booking b, LocalDateTime now) {
		var e = b.getEvent();
		long secondsLeft = b.getStatus() == BookingStatus.HELD && b.getHoldExpiresAt() != null
				? Math.max(0, Duration.between(now, b.getHoldExpiresAt()).toSeconds())
				: 0;
		boolean canCancel = b.getStatus() == BookingStatus.HELD
				|| (b.getStatus() == BookingStatus.CONFIRMED && e.getStartTime().isAfter(now));
		return new BookingResponse(b.getId(), b.getStatus(), b.getQuantity(), b.getAmount(), b.getTicketCode(),
				b.getHoldExpiresAt(), secondsLeft, b.getCreatedAt(), b.getConfirmedAt(), b.getCancelledAt(), canCancel,
				EventInfo.of(e));
	}

}
