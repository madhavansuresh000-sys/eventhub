package com.eventhub.booking;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.eventhub.booking.dto.BookingResponse;
import com.eventhub.booking.dto.CheckoutResponse;
import com.eventhub.common.BusinessRuleException;
import com.eventhub.common.ResourceNotFoundException;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventStatus;
import com.eventhub.payment.Payment;
import com.eventhub.payment.PaymentGateway;
import com.eventhub.payment.PaymentGateway.CheckoutSession;
import com.eventhub.payment.PaymentProvider;
import com.eventhub.payment.PaymentRepository;
import com.eventhub.payment.PaymentStatus;
import com.eventhub.payment.ProcessedPaymentEventRepository;
import com.eventhub.user.UserRepository;
import com.eventhub.waitlist.WaitlistEntry;
import com.eventhub.waitlist.WaitlistEntryRepository;
import com.eventhub.waitlist.WaitlistOffers;
import com.eventhub.waitlist.WaitlistStatus;

/**
 * The booking engine (Phase 6).
 *
 *   hold()    seats go from the event to a HELD booking for 10 minutes (free events: CONFIRMED at once)
 *   pay()     opens a checkout at the payment company
 *   markPaid() the payment company says "paid" -> CONFIRMED (only once, however often it says so)
 *   cancel()  seats go back (and money, if paid)
 *   expireOldHolds() the every-minute job: unpaid holds older than 10 minutes -> EXPIRED, seats back
 *   acceptOffer() a waitlisted student takes the seats kept for them (Phase 7)
 *
 * Whenever seats come back (cancel, expiry) they are offered to the waitlist in the SAME transaction.
 *
 * events.available_seats is the ONE counter of free seats. Every change to it goes through
 * optimistic locking (@Version on Event) + Retry, so two students can never get the same last seat.
 * Calls to the payment company are made OUTSIDE database transactions (a slow network must not
 * keep rows locked), which is why TransactionTemplate is used instead of @Transactional here.
 */
@Service
public class BookingService {

	private static final Logger log = LoggerFactory.getLogger(BookingService.class);

	static final int MAX_PER_BOOKING = 10;

	private static final List<BookingStatus> ACTIVE = List.of(BookingStatus.HELD, BookingStatus.CONFIRMED);

	private static final char[] CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray(); // no 0/O, 1/I

	private static final SecureRandom RANDOM = new SecureRandom();

	private final BookingRepository bookings;

	private final EventRepository events;

	private final UserRepository users;

	private final PaymentRepository payments;

	private final ProcessedPaymentEventRepository processedEvents;

	private final PaymentGateway gateway;

	private final WaitlistEntryRepository waitlist;

	private final WaitlistOffers offers;

	private final TransactionTemplate tx;

	private final TransactionTemplate readTx;

	private final Duration holdTime;

	public BookingService(BookingRepository bookings, EventRepository events, UserRepository users,
			PaymentRepository payments, ProcessedPaymentEventRepository processedEvents, PaymentGateway gateway,
			WaitlistEntryRepository waitlist, WaitlistOffers offers, PlatformTransactionManager txManager,
			@Value("${app.booking.hold-time}") Duration holdTime) {
		this.bookings = bookings;
		this.events = events;
		this.users = users;
		this.payments = payments;
		this.processedEvents = processedEvents;
		this.gateway = gateway;
		this.waitlist = waitlist;
		this.offers = offers;
		this.tx = new TransactionTemplate(txManager);
		this.readTx = new TransactionTemplate(txManager);
		this.readTx.setReadOnly(true);
		this.holdTime = holdTime;
	}

	// =====================================================================================
	// Hold
	// =====================================================================================

	/** Step 2 + 5: take the seats. Paid event -> HELD for 10 minutes; free event -> CONFIRMED straight away. */
	public BookingResponse hold(Long userId, Long eventId, int quantity) {
		Long id = Retry.onConflict(() -> tx.execute(status -> holdOnce(userId, eventId, quantity)));
		return get(userId, id);
	}

	private Long holdOnce(Long userId, Long eventId, int quantity) {
		if (quantity < 1 || quantity > MAX_PER_BOOKING) {
			throw new BusinessRuleException("You can book 1 to " + MAX_PER_BOOKING + " seats at a time.");
		}
		LocalDateTime now = LocalDateTime.now();
		Event event = events.findById(eventId)
			.filter(e -> e.getStatus() == EventStatus.PUBLISHED) // drafts are invisible to students
			.orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
		if (!event.getStartTime().isAfter(now)) {
			throw new BusinessRuleException(event.getTitle() + " has already started.");
		}
		if (bookings.existsByUserIdAndEventIdAndStatusIn(userId, eventId, ACTIVE)) {
			throw new BusinessRuleException("You already have seats for " + event.getTitle() + ". See My tickets.");
		}
		WaitlistEntry myPlace = waitlist
			.findFirstByUserIdAndEventIdAndStatusIn(userId, eventId, List.of(WaitlistStatus.WAITING, WaitlistStatus.OFFERED))
			.orElse(null);
		if (myPlace != null && myPlace.getStatus() == WaitlistStatus.OFFERED) {
			throw new BusinessRuleException("Seats of " + event.getTitle() + " are kept for you. Accept the offer on the Waitlist page.");
		}
		if (event.getAvailableSeats() < quantity) {
			throw new BusinessRuleException(event.getAvailableSeats() == 0
					? event.getTitle() + " is sold out. You can join the waitlist."
					: "Only " + event.getAvailableSeats() + " seats are left for " + event.getTitle() + ".");
		}

		// 1) take the seats FIRST: "UPDATE events ... WHERE id = ? AND version = ?".
		//    If someone else changed the event since we read it, 0 rows match -> exception -> Retry.
		//    (Doing this before inserting the booking also avoids a MySQL deadlock.)
		event.setAvailableSeats(event.getAvailableSeats() - quantity);
		events.saveAndFlush(event);

		// 2) then write the booking
		Booking booking = bookings.save(newBooking(userId, event, quantity, now));
		if (myPlace != null) {
			// booked directly while waiting: the waitlist place is no longer needed
			myPlace.setBooking(booking);
			myPlace.close(WaitlistStatus.BOOKED, now);
		}
		return booking.getId();
	}

	/** Free event -> CONFIRMED; paid event -> HELD for 10 minutes. The seats must already be taken. */
	private Booking newBooking(Long userId, Event event, int quantity, LocalDateTime now) {
		Booking booking = new Booking();
		booking.setUser(users.getReferenceById(userId));
		booking.setEvent(event);
		booking.setQuantity(quantity);
		booking.setAmount(event.getPrice().multiply(BigDecimal.valueOf(quantity)));
		booking.setTicketCode(newTicketCode());
		if (event.getPrice().signum() == 0) {
			booking.setStatus(BookingStatus.CONFIRMED);
			booking.setConfirmedAt(now);
		}
		else {
			booking.setStatus(BookingStatus.HELD);
			booking.setHoldExpiresAt(now.plus(holdTime));
		}
		return booking;
	}

	// =====================================================================================
	// Waitlist offer -> booking (Phase 7)
	// =====================================================================================

	/**
	 * The student accepts a seat offer. The seats were already kept for them when the offer was made,
	 * so this only turns the offer into a normal booking (paid event: HELD, then pay as usual).
	 */
	public BookingResponse acceptOffer(Long userId, Long entryId) {
		Long id = Retry.onConflict(() -> tx.execute(status -> {
			LocalDateTime now = LocalDateTime.now();
			WaitlistEntry entry = waitlist.findWithEventById(entryId)
				.filter(w -> w.getUser().getId().equals(userId))
				.orElseThrow(() -> new ResourceNotFoundException("Waitlist entry", entryId));
			if (entry.getStatus() != WaitlistStatus.OFFERED) {
				throw new BusinessRuleException("There is no seat offer to accept: this waitlist place is "
						+ entry.getStatus().name().toLowerCase() + ".");
			}
			if (!entry.getOfferExpiresAt().isAfter(now)) {
				throw new BusinessRuleException("Sorry, the 30 minutes to accept this offer are over.");
			}
			Event event = entry.getEvent();
			if (!event.getStartTime().isAfter(now)) {
				throw new BusinessRuleException(event.getTitle() + " has already started.");
			}
			if (bookings.existsByUserIdAndEventIdAndStatusIn(userId, event.getId(), ACTIVE)) {
				throw new BusinessRuleException("You already have seats for " + event.getTitle() + ". See My tickets.");
			}
			Booking booking = bookings.save(newBooking(userId, event, entry.getQuantity(), now));
			entry.setBooking(booking);
			entry.close(WaitlistStatus.BOOKED, now);
			return booking.getId();
		}));
		return get(userId, id);
	}

	// =====================================================================================
	// Pay
	// =====================================================================================

	/** Step 6: open a checkout for a HELD booking and tell React where to send the student. */
	public CheckoutResponse pay(Long userId, Long bookingId) {
		// 1) check and load everything the payment page needs (short read-only transaction)
		Booking booking = readTx.execute(status -> {
			Booking b = own(userId, bookingId);
			if (b.getStatus() != BookingStatus.HELD) {
				throw new BusinessRuleException("This booking is " + b.getStatus().name().toLowerCase() + ", so there is nothing to pay.");
			}
			if (!b.getHoldExpiresAt().isAfter(LocalDateTime.now())) {
				throw new BusinessRuleException("Your 10 minutes are over and the seats were released. Please book again.");
			}
			b.getUser().getEmail(); // load now; used outside the transaction
			return b;
		});

		// 2) talk to the payment company (no database transaction open while we wait for the network)
		CheckoutSession session = gateway.createCheckout(booking);

		// 3) remember the attempt
		tx.executeWithoutResult(status -> {
			Payment payment = new Payment();
			payment.setBooking(bookings.getReferenceById(bookingId));
			payment.setProvider(gateway.provider());
			payment.setSessionId(session.sessionId());
			payment.setStatus(PaymentStatus.PENDING);
			payment.setAmount(booking.getAmount());
			payment.setCurrency("INR");
			payments.save(payment);
		});
		return new CheckoutResponse(gateway.provider(), session.sessionId(), session.redirectUrl());
	}

	// =====================================================================================
	// Paid (webhook, return from Stripe, or the dev test page)
	// =====================================================================================

	public enum PaidResult { CONFIRMED, ALREADY_DONE, DUPLICATE_NOTICE, REFUNDED_LATE, UNKNOWN_SESSION }

	/**
	 * Steps 7 + 8: the payment company says session X is paid.
	 *
	 * IDEMPOTENCY: noticeId (e.g. Stripe's evt_123) is inserted into processed_payment_events FIRST.
	 * The table's primary key refuses a second copy, so if Stripe sends the same notice twice
	 * (it does that when our answer is slow), the second one changes nothing.
	 */
	public PaidResult markPaid(String noticeId, String sessionId) {
		List<String> toRefund = new ArrayList<>();
		PaidResult result;
		try {
			result = Retry.onConflict(() -> tx.execute(status -> {
				toRefund.clear();
				return markPaidOnce(noticeId, sessionId, toRefund);
			}));
		}
		catch (DataIntegrityViolationException duplicate) {
			log.info("Payment notice {} was already handled", noticeId);
			return PaidResult.DUPLICATE_NOTICE;
		}
		toRefund.forEach(gateway::refund); // after the commit, outside the transaction
		return result;
	}

	private PaidResult markPaidOnce(String noticeId, String sessionId, List<String> toRefund) {
		processedEvents.insert(noticeId); // throws DataIntegrityViolationException for a duplicate

		Payment payment = payments.findBySessionId(sessionId).orElse(null);
		if (payment == null) {
			log.warn("Payment notice {} for unknown session {}", noticeId, sessionId);
			return PaidResult.UNKNOWN_SESSION;
		}
		if (payment.getStatus() == PaymentStatus.PAID || payment.getStatus() == PaymentStatus.REFUNDED) {
			return PaidResult.ALREADY_DONE;
		}
		LocalDateTime now = LocalDateTime.now();
		payment.setStatus(PaymentStatus.PAID);
		payment.setPaidAt(now);

		Booking booking = payment.getBooking();
		switch (booking.getStatus()) {
			case HELD -> {
				confirm(booking, now);
				return PaidResult.CONFIRMED;
			}
			case EXPIRED -> {
				// paid just after the 10 minutes ran out: give the seats again if they are still free
				Event event = booking.getEvent();
				if (event.getAvailableSeats() >= booking.getQuantity() && event.getStartTime().isAfter(now)) {
					event.setAvailableSeats(event.getAvailableSeats() - booking.getQuantity());
					events.saveAndFlush(event);
					confirm(booking, now);
					return PaidResult.CONFIRMED;
				}
				return refundLater(payment, now, toRefund);
			}
			default -> {
				// CANCELLED, or CONFIRMED already by another payment: never keep money twice
				return refundLater(payment, now, toRefund);
			}
		}
	}

	private void confirm(Booking booking, LocalDateTime now) {
		booking.setStatus(BookingStatus.CONFIRMED);
		booking.setConfirmedAt(now);
		booking.setHoldExpiresAt(null);
	}

	private PaidResult refundLater(Payment payment, LocalDateTime now, List<String> toRefund) {
		payment.setStatus(PaymentStatus.REFUNDED);
		payment.setRefundedAt(now);
		toRefund.add(payment.getSessionId());
		log.info("Payment {} arrived for booking {} ({}): refunding", payment.getSessionId(),
				payment.getBooking().getId(), payment.getBooking().getStatus());
		return PaidResult.REFUNDED_LATE;
	}

	/** The student is back from the payment page: ask the payment company directly (the webhook may be slow). */
	public BookingResponse verify(Long userId, String sessionId) {
		Long bookingId = readTx.execute(status -> {
			Payment payment = payments.findBySessionId(sessionId)
				.filter(p -> p.getBooking().getUser().getId().equals(userId))
				.orElseThrow(() -> new ResourceNotFoundException("Payment", sessionId));
			return payment.getBooking().getId();
		});
		if (gateway.isPaid(sessionId)) {
			markPaid("verify:" + sessionId, sessionId);
		}
		return get(userId, bookingId);
	}

	// =====================================================================================
	// Dev test payment page (only when there are no Stripe keys)
	// =====================================================================================

	/** What the test payment page shows: event, seats and amount of this session. */
	public TestPayment testPayment(Long userId, String sessionId) {
		return readTx.execute(status -> {
			Payment p = ownTestPayment(userId, sessionId);
			Booking b = p.getBooking();
			return new TestPayment(sessionId, b.getId(), b.getEvent().getTitle(), b.getQuantity(), p.getAmount(), p.getStatus());
		});
	}

	/** The Pay button of the test page: runs exactly the same code as a real Stripe webhook. */
	public BookingResponse completeTestPayment(Long userId, String sessionId) {
		Long bookingId = readTx.execute(status -> ownTestPayment(userId, sessionId).getBooking().getId());
		markPaid("fake_evt_" + sessionId, sessionId); // same notice id every time: a double click is ignored
		return get(userId, bookingId);
	}

	public record TestPayment(String sessionId, Long bookingId, String eventTitle, int quantity, BigDecimal amount,
			PaymentStatus status) {
	}

	private Payment ownTestPayment(Long userId, String sessionId) {
		return payments.findBySessionId(sessionId)
			.filter(p -> gateway.provider() == PaymentProvider.FAKE && p.getProvider() == PaymentProvider.FAKE)
			.filter(p -> p.getBooking().getUser().getId().equals(userId))
			.orElseThrow(() -> new ResourceNotFoundException("Payment", sessionId));
	}

	// =====================================================================================
	// Cancel and expire
	// =====================================================================================

	/** Step 9: the student cancels. Seats go back; a paid booking gets its money back. */
	public BookingResponse cancel(Long userId, Long bookingId) {
		List<String> toClose = new ArrayList<>();
		List<String> toRefund = new ArrayList<>();
		Retry.onConflict(() -> tx.execute(status -> {
			toClose.clear();
			toRefund.clear();
			Booking booking = own(userId, bookingId);
			LocalDateTime now = LocalDateTime.now();
			if (!booking.getStatus().holdsSeats()) {
				throw new BusinessRuleException("This booking is already " + booking.getStatus().name().toLowerCase() + ".");
			}
			if (booking.getStatus() == BookingStatus.CONFIRMED && !booking.getEvent().getStartTime().isAfter(now)) {
				throw new BusinessRuleException("The event has already started, so this booking cannot be cancelled.");
			}
			release(booking, BookingStatus.CANCELLED, now, toClose, toRefund);
			booking.setCancelledAt(now);
			return null;
		}));
		toClose.forEach(gateway::expireSession);
		toRefund.forEach(gateway::refund);
		return get(userId, bookingId);
	}

	/**
	 * Step 4: called every minute by HoldExpiryJob. Each booking is expired in its own small
	 * transaction, so one problem does not stop the others. Returns how many were expired.
	 */
	public int expireOldHolds() {
		int expired = 0;
		for (Long id : bookings.findExpiredHoldIds(LocalDateTime.now())) {
			List<String> toClose = new ArrayList<>();
			Boolean done = Retry.onConflict(() -> tx.execute(status -> {
				toClose.clear();
				Booking booking = bookings.findById(id).orElse(null);
				LocalDateTime now = LocalDateTime.now();
				// re-check: the student may have paid a moment ago
				if (booking == null || booking.getStatus() != BookingStatus.HELD || booking.getHoldExpiresAt().isAfter(now)) {
					return false;
				}
				release(booking, BookingStatus.EXPIRED, now, toClose, new ArrayList<>());
				return true;
			}));
			toClose.forEach(gateway::expireSession);
			if (Boolean.TRUE.equals(done)) {
				expired++;
			}
		}
		if (expired > 0) {
			log.info("Expired {} unpaid seat holds; their seats are free again", expired);
		}
		return expired;
	}

	/** Seats back to the event; open payment pages closed; paid money marked for refund. */
	private void release(Booking booking, BookingStatus newStatus, LocalDateTime now, List<String> toClose,
			List<String> toRefund) {
		Event event = booking.getEvent();
		event.setAvailableSeats(event.getAvailableSeats() + booking.getQuantity());
		events.saveAndFlush(event); // seats first (same order as hold, see holdOnce)
		booking.setStatus(newStatus);
		booking.setHoldExpiresAt(null);
		for (Payment p : payments.findByBookingIdAndStatus(booking.getId(), PaymentStatus.PENDING)) {
			p.setStatus(PaymentStatus.EXPIRED);
			toClose.add(p.getSessionId());
		}
		for (Payment p : payments.findByBookingIdAndStatus(booking.getId(), PaymentStatus.PAID)) {
			p.setStatus(PaymentStatus.REFUNDED);
			p.setRefundedAt(now);
			toRefund.add(p.getSessionId());
		}
		offers.offerFreeSeats(event, now); // the next students in the queue get these seats
	}

	// =====================================================================================
	// Read
	// =====================================================================================

	public BookingResponse get(Long userId, Long bookingId) {
		return readTx.execute(status -> BookingResponse.from(own(userId, bookingId), LocalDateTime.now()));
	}

	public List<BookingResponse> mine(Long userId) {
		return readTx.execute(status -> {
			LocalDateTime now = LocalDateTime.now();
			return bookings.findByUserIdOrderByCreatedAtDesc(userId).stream().map(b -> BookingResponse.from(b, now)).toList();
		});
	}

	/** Someone else's booking looks exactly like a missing one (404): no hints about other students. */
	private Booking own(Long userId, Long bookingId) {
		return bookings.findWithEventById(bookingId)
			.filter(b -> b.getUser().getId().equals(userId))
			.orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));
	}

	private static String newTicketCode() {
		StringBuilder code = new StringBuilder("EVH-");
		for (int i = 0; i < 10; i++) {
			if (i == 5) {
				code.append('-');
			}
			code.append(CODE_CHARS[RANDOM.nextInt(CODE_CHARS.length)]);
		}
		return code.toString();
	}

}
