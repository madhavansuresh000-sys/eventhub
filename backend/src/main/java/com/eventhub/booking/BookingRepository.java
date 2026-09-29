package com.eventhub.booking;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

	long countByEventIdAndStatusIn(Long eventId, List<BookingStatus> statuses);

}
