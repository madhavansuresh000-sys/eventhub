package com.eventhub.booking;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.eventhub.user.User;

public interface BookingRepository extends JpaRepository<Booking, Long> {

	/** My tickets: newest first, with the event and its club loaded in the same query. */
	@EntityGraph(attributePaths = { "event", "event.club" })
	List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);

	@EntityGraph(attributePaths = { "event", "event.club", "user" })
	Optional<Booking> findWithEventById(Long id);

	/** "Does this student already have seats for this event?" (one active booking per student per event) */
	boolean existsByUserIdAndEventIdAndStatusIn(Long userId, Long eventId, List<BookingStatus> statuses);

	/** For the expiry job: ids of HELD bookings whose 10 minutes are over. */
	@Query("select b.id from Booking b where b.status = com.eventhub.booking.BookingStatus.HELD and b.holdExpiresAt < :now")
	List<Long> findExpiredHoldIds(@Param("now") LocalDateTime now);

	/** Reminder job: confirmed bookings of events starting in [from, to) that got no reminder yet. */
	@Query("select b.id from Booking b where b.status = com.eventhub.booking.BookingStatus.CONFIRMED"
			+ " and b.reminderSentAt is null and b.event.startTime >= :from and b.event.startTime < :to")
	List<Long> findIdsNeedingReminder(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

	/** The gate: which booking is this QR code? */
	@EntityGraph(attributePaths = { "event", "user", "checkedInBy" })
	Optional<Booking> findByTicketCode(String ticketCode);

	/**
	 * Marks the ticket as used - ONLY if it is not used yet. Returns 1 (you let them in) or 0 (someone
	 * else scanned it a moment earlier). The database does the "check and set" in one step, so two
	 * volunteers can never both get VALID. The version goes up too, like any other change of the booking.
	 */
	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query("update Booking b set b.checkedInAt = :now, b.checkedInBy = :scanner, b.version = b.version + 1"
			+ " where b.id = :id and b.checkedInAt is null and b.status = com.eventhub.booking.BookingStatus.CONFIRMED")
	int markCheckedIn(@Param("id") Long id, @Param("now") LocalDateTime now, @Param("scanner") User scanner);

	/** The live counter: [booked people, checked-in people] of one event (confirmed bookings only). */
	@Query("select coalesce(sum(b.quantity), 0), coalesce(sum(case when b.checkedInAt is not null then b.quantity else 0 end), 0)"
			+ " from Booking b where b.event.id = :eventId and b.status = com.eventhub.booking.BookingStatus.CONFIRMED")
	List<Object[]> gateCounts(@Param("eventId") Long eventId);

	long countByEventIdAndStatusIn(Long eventId, List<BookingStatus> statuses);

}
