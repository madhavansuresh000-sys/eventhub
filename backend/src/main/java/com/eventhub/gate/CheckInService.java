package com.eventhub.gate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.booking.Booking;
import com.eventhub.booking.BookingRepository;
import com.eventhub.booking.BookingStatus;
import com.eventhub.club.ClubMemberRepository;
import com.eventhub.club.ClubRole;
import com.eventhub.common.ResourceNotFoundException;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventStatus;
import com.eventhub.gate.dto.CheckInResponse;
import com.eventhub.gate.dto.GateEventResponse;
import com.eventhub.gate.dto.GateStats;
import com.eventhub.user.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * The gate (Phase 7 step 4). A volunteer scans a QR code; the server answers:
 *
 *   VALID         green - let them in (the ticket is now used)
 *   ALREADY_USED  red   - this ticket was scanned before (a screenshot shared with a friend?)
 *   INVALID       red   - not a ticket, another event's ticket, cancelled, or never paid
 *
 * Permission (volunteer / organizer of the event's club) is checked on GateController.
 */
@Service
@RequiredArgsConstructor
public class CheckInService {

	private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.forLanguageTag("en-IN"));

	private final BookingRepository bookings;

	private final EventRepository events;

	private final UserRepository users;

	private final ClubMemberRepository members;

	@Transactional
	public CheckInResponse checkIn(Long eventId, String rawCode, Long scannerId) {
		Event event = events.findById(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
		String code = rawCode.trim().toUpperCase(Locale.ROOT);
		LocalDateTime now = LocalDateTime.now();

		Booking booking = bookings.findByTicketCode(code).orElse(null);
		if (booking == null) {
			return invalid(event, code, "This code is not an EventHub ticket. Ask for the QR code in the app.");
		}
		if (!booking.getEvent().getId().equals(eventId)) {
			return invalid(event, code, "This ticket is for " + booking.getEvent().getTitle() + ", not " + event.getTitle() + ".");
		}
		String holder = booking.getUser().getFullName();
		if (booking.getStatus() != BookingStatus.CONFIRMED) {
			String why = switch (booking.getStatus()) {
				case CANCELLED -> "This booking was cancelled.";
				case HELD -> "This booking is not paid yet.";
				default -> "This booking was never paid (" + booking.getStatus().name().toLowerCase() + ").";
			};
			return invalid(event, code, why);
		}
		if (!event.getEndTime().isAfter(now)) {
			return invalid(event, code, event.getTitle() + " is already over.");
		}
		if (booking.getCheckedInAt() != null) {
			return alreadyUsed(event, code, holder, booking);
		}

		// the one important line: "mark used, but only if not used yet" - done by the database in one step
		int updated = bookings.markCheckedIn(booking.getId(), now, users.getReferenceById(scannerId));
		if (updated == 0) {
			// Another gate scanned it a split second ago. We cannot simply read the booking again to see when:
			// MySQL (REPEATABLE READ) keeps showing this transaction the snapshot from its first read,
			// where the ticket was still unused.
			return new CheckInResponse(CheckInResult.ALREADY_USED, "Already used just now at another gate.", code, holder,
					booking.getQuantity(), null, stats(eventId));
		}
		int people = booking.getQuantity();
		return new CheckInResponse(CheckInResult.VALID, "Let in " + people + (people == 1 ? " person" : " people") + ".",
				code, holder, people, now, stats(eventId));
	}

	@Transactional(readOnly = true)
	public GateStats stats(Long eventId) {
		Object[] row = bookings.gateCounts(eventId).getFirst();
		return new GateStats(eventId, ((Number) row[0]).longValue(), ((Number) row[1]).longValue());
	}

	/** The events this user may scan: published, not ended, of clubs where they volunteer or organize. */
	@Transactional(readOnly = true)
	public List<GateEventResponse> myGateEvents(Long userId) {
		List<Long> clubIds = members.findByUserIdOrderByClubId(userId).stream()
			.filter(m -> m.getClubRole() == ClubRole.VOLUNTEER || m.getClubRole() == ClubRole.ORGANIZER)
			.map(m -> m.getClub().getId())
			.distinct()
			.toList();
		if (clubIds.isEmpty()) {
			return List.of();
		}
		return events.findByClubIdInAndStatusAndEndTimeAfterOrderByStartTimeAsc(clubIds, EventStatus.PUBLISHED, LocalDateTime.now())
			.stream().map(GateEventResponse::from).toList();
	}

	private CheckInResponse alreadyUsed(Event event, String code, String holder, Booking b) {
		String by = b.getCheckedInBy() == null ? "" : " by " + b.getCheckedInBy().getFullName();
		return new CheckInResponse(CheckInResult.ALREADY_USED,
				"Already used at " + TIME.format(b.getCheckedInAt()) + by + ".", code, holder, b.getQuantity(),
				b.getCheckedInAt(), stats(event.getId()));
	}

	private CheckInResponse invalid(Event event, String code, String message) {
		return new CheckInResponse(CheckInResult.INVALID, message, code, null, null, null, stats(event.getId()));
	}

}
