package com.eventhub.waitlist;

import java.time.Duration;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventStatus;

/**
 * "A seat is free again - who gets it?"
 *
 * Called INSIDE the transaction that freed the seats (a cancel, an expired hold, an expired offer,
 * more seats added by the organizer), so the free seats go to the queue in the same moment and no
 * walk-in student can grab them in between.
 *
 * Queue order is first come, first served. A group that does not fit keeps its place:
 *   2 seats free, #1 wants 3, #2 wants 2  ->  #2 gets the offer now, #1 stays #1 for the next seats.
 */
@Component
public class WaitlistOffers {

	private static final Logger log = LoggerFactory.getLogger(WaitlistOffers.class);

	private final EventRepository events;

	private final WaitlistEntryRepository entries;

	private final ApplicationEventPublisher publisher;

	private final Duration offerTime;

	public WaitlistOffers(EventRepository events, WaitlistEntryRepository entries, ApplicationEventPublisher publisher,
			@Value("${app.waitlist.offer-time}") Duration offerTime) {
		this.events = events;
		this.entries = entries;
		this.publisher = publisher;
		this.offerTime = offerTime;
	}

	/** Offers the event's free seats to waiting students. Returns how many offers were made. */
	public int offerFreeSeats(Event event, LocalDateTime now) {
		if (event.getStatus() != EventStatus.PUBLISHED || !event.getStartTime().isAfter(now)
				|| event.getAvailableSeats() == 0) {
			return 0;
		}
		int offers = 0;
		for (WaitlistEntry entry : entries.findByEventIdAndStatusOrderByIdAsc(event.getId(), WaitlistStatus.WAITING)) {
			if (event.getAvailableSeats() == 0) {
				break;
			}
			if (entry.getQuantity() > event.getAvailableSeats()) {
				continue; // does not fit yet; keeps its place
			}
			event.setAvailableSeats(event.getAvailableSeats() - entry.getQuantity()); // kept for this student
			entry.setStatus(WaitlistStatus.OFFERED);
			entry.setOfferedAt(now);
			entry.setOfferExpiresAt(now.plus(offerTime));
			// sent to listeners (email, bell) only AFTER the transaction commits - see notification package
			publisher.publishEvent(new SeatOffered(entry.getId()));
			offers++;
		}
		if (offers > 0) {
			events.saveAndFlush(event); // optimistic lock: a clash with another booking -> the caller retries
			log.info("Offered free seats of event {} to {} waiting student(s)", event.getId(), offers);
		}
		return offers;
	}

	/**
	 * An offer ends without a booking (the student left, or 30 minutes passed):
	 * its kept seats go back, and straight on to the next students in the queue.
	 */
	public void giveBack(WaitlistEntry entry, WaitlistStatus finalStatus, LocalDateTime now) {
		Event event = entry.getEvent();
		if (entry.getStatus() == WaitlistStatus.OFFERED) {
			event.setAvailableSeats(event.getAvailableSeats() + entry.getQuantity());
			events.saveAndFlush(event); // seats first (same order as bookings, avoids MySQL deadlocks)
		}
		entry.close(finalStatus, now);
		entries.flush();
		offerFreeSeats(event, now);
	}

	/** Published when a student gets a seat offer. */
	public record SeatOffered(Long entryId) {
	}

}
