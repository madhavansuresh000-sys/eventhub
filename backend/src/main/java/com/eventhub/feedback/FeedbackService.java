package com.eventhub.feedback;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.booking.Booking;
import com.eventhub.booking.BookingRepository;
import com.eventhub.common.BusinessRuleException;
import com.eventhub.common.ResourceNotFoundException;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.feedback.dto.EventFeedbackResponse;
import com.eventhub.feedback.dto.EventFeedbackResponse.Comment;
import com.eventhub.feedback.dto.FeedbackRequest;
import com.eventhub.feedback.dto.MyFeedbackResponse;

import lombok.RequiredArgsConstructor;

/**
 * Feedback (Phase 7 step 6). Same door as certificates: only a ticket that was scanned at the gate,
 * of an event that has ended. You cannot rate a talk you did not attend.
 */
@Service
@RequiredArgsConstructor
public class FeedbackService {

	private final FeedbackRepository feedback;

	private final BookingRepository bookings;

	private final EventRepository events;

	/** The events I attended, each with my rating or null ("Rate this event"). */
	@Transactional(readOnly = true)
	public List<MyFeedbackResponse> mine(Long userId) {
		Map<Long, Feedback> given = feedback.findByUserId(userId).stream()
			.collect(Collectors.toMap(f -> f.getBooking().getId(), Function.identity()));
		return bookings.findIdsEarningCertificate(userId, LocalDateTime.now()).stream()
			.map(id -> bookings.findWithEventById(id).orElseThrow())
			.map(b -> {
				Feedback f = given.get(b.getId());
				return new MyFeedbackResponse(b.getId(), b.getEvent().getId(), b.getEvent().getTitle(),
						b.getEvent().getStartTime(), f == null ? null : f.getRating(), f == null ? null : f.getComment());
			})
			.toList();
	}

	/** Give or change my rating for one attended ticket. */
	@Transactional
	public MyFeedbackResponse give(Long userId, Long bookingId, FeedbackRequest request) {
		Booking b = bookings.findWithEventById(bookingId)
			.filter(x -> x.getUser().getId().equals(userId)) // someone else's booking = 404
			.orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));
		Event event = b.getEvent();
		if (b.getCheckedInAt() == null) {
			throw new BusinessRuleException("Only students who attended " + event.getTitle() + " (ticket scanned at the gate) can rate it.");
		}
		if (event.getEndTime().isAfter(LocalDateTime.now())) {
			throw new BusinessRuleException("You can rate " + event.getTitle() + " after it ends.");
		}
		String comment = request.comment() == null || request.comment().isBlank() ? null : request.comment().trim();

		Feedback f = feedback.findByBookingId(bookingId).orElse(null);
		if (f == null) {
			f = new Feedback();
			f.setBooking(b);
			f.setEvent(event);
			f.setUser(b.getUser());
		}
		else {
			f.setUpdatedAt(LocalDateTime.now());
		}
		f.setRating(request.rating());
		f.setComment(comment);
		feedback.save(f);
		return new MyFeedbackResponse(b.getId(), event.getId(), event.getTitle(), event.getStartTime(), f.getRating(), comment);
	}

	/** The organizer's view of one event: average, stars per level, anonymous comments. */
	@Transactional(readOnly = true)
	public EventFeedbackResponse forEvent(Long eventId) {
		Event event = events.findById(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
		long[] stars = new long[5];
		for (Object[] row : feedback.countByRating(eventId)) {
			stars[((Number) row[0]).intValue() - 1] = ((Number) row[1]).longValue();
		}
		long count = 0;
		long sum = 0;
		for (int i = 0; i < 5; i++) {
			count += stars[i];
			sum += stars[i] * (i + 1);
		}
		Double average = count == 0 ? null : Math.round(sum * 10.0 / count) / 10.0; // one decimal: 4.3
		List<Comment> comments = feedback.findByEventIdOrderByCreatedAtDesc(eventId).stream()
			.filter(f -> f.getComment() != null)
			.map(f -> new Comment(f.getRating(), f.getComment(), f.getCreatedAt()))
			.toList();
		long attended = ((Number) bookings.gateCounts(eventId).getFirst()[1]).longValue();
		return new EventFeedbackResponse(eventId, event.getTitle(), count, average, stars, attended, comments);
	}

}
