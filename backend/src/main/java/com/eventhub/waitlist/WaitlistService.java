package com.eventhub.waitlist;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.eventhub.booking.BookingRepository;
import com.eventhub.booking.BookingStatus;
import com.eventhub.booking.Retry;
import com.eventhub.common.BusinessRuleException;
import com.eventhub.common.ResourceNotFoundException;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventStatus;
import com.eventhub.user.UserRepository;
import com.eventhub.waitlist.dto.WaitlistResponse;

/**
 * The smart waitlist (Phase 7 step 1).
 *
 *   join()   sold out? stand in the queue: "You are #3"
 *   leave()  step out of the queue (an offer you leave goes to the next student)
 *   expireOldOffers() the every-minute job: offers not accepted in 30 minutes go to the next student
 *
 * Accepting an offer makes a booking, so it lives in BookingService.acceptOffer().
 * Making offers when seats come back: WaitlistOffers.
 */
@Service
public class WaitlistService {

	private static final Logger log = LoggerFactory.getLogger(WaitlistService.class);

	private static final List<WaitlistStatus> OPEN = List.of(WaitlistStatus.WAITING, WaitlistStatus.OFFERED);

	private static final List<BookingStatus> ACTIVE_BOOKING = List.of(BookingStatus.HELD, BookingStatus.CONFIRMED);

	private final WaitlistEntryRepository entries;

	private final WaitlistOffers offers;

	private final EventRepository events;

	private final BookingRepository bookings;

	private final UserRepository users;

	private final TransactionTemplate tx;

	private final TransactionTemplate readTx;

	public WaitlistService(WaitlistEntryRepository entries, WaitlistOffers offers, EventRepository events,
			BookingRepository bookings, UserRepository users, PlatformTransactionManager txManager) {
		this.entries = entries;
		this.offers = offers;
		this.events = events;
		this.bookings = bookings;
		this.users = users;
		this.tx = new TransactionTemplate(txManager);
		this.readTx = new TransactionTemplate(txManager);
		this.readTx.setReadOnly(true);
	}

	/** Stand in the queue. Only when there are not enough free seats (otherwise just book). */
	public WaitlistResponse join(Long userId, Long eventId, int quantity) {
		Long id = Retry.onConflict(() -> tx.execute(status -> {
			LocalDateTime now = LocalDateTime.now();
			Event event = events.findLockedById(eventId)
				.filter(e -> e.getStatus() == EventStatus.PUBLISHED)
				.orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
			if (!event.getStartTime().isAfter(now)) {
				throw new BusinessRuleException(event.getTitle() + " has already started.");
			}
			if (quantity > event.getTotalSeats()) {
				throw new BusinessRuleException(event.getTitle() + " has only " + event.getTotalSeats() + " seats in total.");
			}
			if (bookings.existsByUserIdAndEventIdAndStatusIn(userId, eventId, ACTIVE_BOOKING)) {
				throw new BusinessRuleException("You already have seats for " + event.getTitle() + ". See My tickets.");
			}
			if (entries.findFirstByUserIdAndEventIdAndStatusIn(userId, eventId, OPEN).isPresent()) {
				throw new BusinessRuleException("You are already on the waitlist for " + event.getTitle() + ".");
			}
			if (event.getAvailableSeats() >= quantity) {
				throw new BusinessRuleException(event.getAvailableSeats() + " seats are free for " + event.getTitle()
						+ ", so you can book now - no need to wait.");
			}
			WaitlistEntry entry = new WaitlistEntry();
			entry.setUser(users.getReferenceById(userId));
			entry.setEvent(event);
			entry.setQuantity(quantity);
			entry.setStatus(WaitlistStatus.WAITING);
			entries.saveAndFlush(entry);
			// a few seats may be free that did not fit anyone before - maybe they fit this student
			offers.offerFreeSeats(event, now);
			return entry.getId();
		}));
		return get(userId, id);
	}

	/** Step out of the queue. If seats were being kept for me, they go to the next student. */
	public WaitlistResponse leave(Long userId, Long entryId) {
		Retry.onConflict(() -> tx.execute(status -> {
			WaitlistEntry entry = own(userId, entryId);
			if (!entry.getStatus().isOpen()) {
				throw new BusinessRuleException("You are not on this waitlist any more (" + entry.getStatus().name().toLowerCase() + ").");
			}
			offers.giveBack(entry, WaitlistStatus.LEFT, LocalDateTime.now());
			return null;
		}));
		return get(userId, entryId);
	}

	/** Called every minute by WaitlistOfferJob. Returns how many offers ran out. */
	public int expireOldOffers() {
		int expired = 0;
		for (Long id : entries.findExpiredOfferIds(LocalDateTime.now())) {
			Boolean done = Retry.onConflict(() -> tx.execute(status -> {
				WaitlistEntry entry = entries.findById(id).orElse(null);
				LocalDateTime now = LocalDateTime.now();
				// re-check: the student may have accepted a moment ago
				if (entry == null || entry.getStatus() != WaitlistStatus.OFFERED || entry.getOfferExpiresAt().isAfter(now)) {
					return false;
				}
				offers.giveBack(entry, WaitlistStatus.EXPIRED, now);
				return true;
			}));
			if (Boolean.TRUE.equals(done)) {
				expired++;
			}
		}
		if (expired > 0) {
			log.info("{} waitlist offer(s) ran out; their seats went to the next students", expired);
		}
		return expired;
	}

	public WaitlistResponse get(Long userId, Long entryId) {
		return readTx.execute(status -> toResponse(own(userId, entryId), LocalDateTime.now()));
	}

	public List<WaitlistResponse> mine(Long userId) {
		return readTx.execute(status -> {
			LocalDateTime now = LocalDateTime.now();
			return entries.findByUserIdOrderByCreatedAtDesc(userId).stream().map(w -> toResponse(w, now)).toList();
		});
	}

	private WaitlistResponse toResponse(WaitlistEntry w, LocalDateTime now) {
		Integer position = w.getStatus() == WaitlistStatus.WAITING
				? (int) entries.countByEventIdAndStatusAndIdLessThan(w.getEvent().getId(), WaitlistStatus.WAITING, w.getId()) + 1
				: null;
		return WaitlistResponse.from(w, position, now);
	}

	/** Someone else's entry looks exactly like a missing one (404). */
	private WaitlistEntry own(Long userId, Long entryId) {
		return entries.findWithEventById(entryId)
			.filter(w -> w.getUser().getId().equals(userId))
			.orElseThrow(() -> new ResourceNotFoundException("Waitlist entry", entryId));
	}

}
