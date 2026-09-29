package com.eventhub.notification;

import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.eventhub.booking.Booking;
import com.eventhub.booking.BookingConfirmed;
import com.eventhub.booking.BookingRepository;
import com.eventhub.club.ClubMemberRepository;
import com.eventhub.club.ClubRole;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventReviewed;
import com.eventhub.waitlist.WaitlistEntry;
import com.eventhub.waitlist.WaitlistEntryRepository;
import com.eventhub.waitlist.WaitlistOffers.SeatOffered;

import lombok.RequiredArgsConstructor;

/**
 * WHO gets WHICH message. The booking, waitlist and event code only say what happened
 * (SeatOffered, BookingConfirmed, EventReviewed); this class turns that into notifications.
 * That way the booking engine does not need to know anything about emails or bells.
 *
 * @EventListener runs straight away, inside the publisher's transaction: the notification is saved
 * together with the change (or rolled back with it).
 */
@Component
@RequiredArgsConstructor
public class NotificationTriggers {

	static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("EEE d MMM, h:mm a", Locale.forLanguageTag("en-IN"));

	static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.forLanguageTag("en-IN"));

	private final NotificationService notifications;

	private final WaitlistEntryRepository waitlist;

	private final BookingRepository bookings;

	private final EventRepository events;

	private final ClubMemberRepository members;

	/** Done-when check of Phase 7: a cancel frees a seat -> the first waitlisted student is emailed. */
	@EventListener
	public void seatOffered(SeatOffered offered) {
		WaitlistEntry entry = waitlist.findById(offered.entryId()).orElseThrow();
		Event event = entry.getEvent();
		String seats = entry.getQuantity() == 1 ? "1 seat" : entry.getQuantity() + " seats";
		String them = entry.getQuantity() == 1 ? "it" : "them";
		notifications.create(entry.getUser().getId(), NotificationKind.SEAT_OFFERED,
				"Seats free for " + event.getTitle() + " - kept for you",
				"Good news! " + seats + " for " + event.getTitle() + " (" + WHEN.format(event.getStartTime())
						+ ") came free and we are keeping " + them + " for you until " + TIME.format(entry.getOfferExpiresAt())
						+ ". Accept " + them + " on your Waitlist page before then, or " + (entry.getQuantity() == 1 ? "it goes" : "they go")
						+ " to the next student.",
				"/waitlist", true);
	}

	@EventListener
	public void bookingConfirmed(BookingConfirmed confirmed) {
		Booking b = bookings.findWithEventById(confirmed.bookingId()).orElseThrow();
		Event event = b.getEvent();
		notifications.create(b.getUser().getId(), NotificationKind.BOOKING_CONFIRMED,
				"Your ticket for " + event.getTitle() + " is confirmed",
				"You have " + (b.getQuantity() == 1 ? "1 seat" : b.getQuantity() + " seats") + " for " + event.getTitle()
						+ " on " + WHEN.format(event.getStartTime()) + " at " + event.getVenue()
						+ ". Show the QR code of your ticket at the gate. Ticket code: " + b.getTicketCode(),
				"/tickets/" + b.getId(), true);
	}

	/** Every organizer of the club hears the admin's decision (bell + email). */
	@EventListener
	public void eventReviewed(EventReviewed reviewed) {
		Event event = events.findWithDetailsById(reviewed.eventId()).orElseThrow();
		String title = reviewed.approved()
				? event.getTitle() + " is approved and published"
				: event.getTitle() + " was sent back";
		String body = reviewed.approved()
				? "The admin approved " + event.getTitle() + ". Students can see it and book seats now."
				: "The admin sent " + event.getTitle() + " back to draft. Reason: \"" + reviewed.reason()
						+ "\". Fix it and submit it again.";
		members.findByClubId(event.getClub().getId()).stream()
			.filter(m -> m.getClubRole() == ClubRole.ORGANIZER)
			.forEach(m -> notifications.create(m.getUser().getId(),
					reviewed.approved() ? NotificationKind.EVENT_APPROVED : NotificationKind.EVENT_SENT_BACK,
					title, body, "/organizer", true));
	}

	/** Used by ReminderService (called directly, not an event). */
	void reminder(Booking b) {
		Event event = b.getEvent();
		notifications.create(b.getUser().getId(), NotificationKind.EVENT_REMINDER,
				"Tomorrow: " + event.getTitle(),
				event.getTitle() + " starts tomorrow, " + WHEN.format(event.getStartTime()) + ", at " + event.getVenue()
						+ ". Keep your QR ticket ready on your phone. See you there!",
				"/tickets/" + b.getId(), true);
	}

}
