package com.eventhub.waitlist;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WaitlistEntryRepository extends JpaRepository<WaitlistEntry, Long> {

	/** The queue of one event, first come first served. */
	List<WaitlistEntry> findByEventIdAndStatusOrderByIdAsc(Long eventId, WaitlistStatus status);

	/** "You are #3": how many are waiting in front of me. */
	long countByEventIdAndStatusAndIdLessThan(Long eventId, WaitlistStatus status, Long id);

	Optional<WaitlistEntry> findFirstByUserIdAndEventIdAndStatusIn(Long userId, Long eventId,
			List<WaitlistStatus> statuses);

	/** My waitlist page: newest first, with the event and club loaded in the same query. */
	@EntityGraph(attributePaths = { "event", "event.club", "booking" })
	List<WaitlistEntry> findByUserIdOrderByCreatedAtDesc(Long userId);

	@EntityGraph(attributePaths = { "event", "event.club", "user", "booking" })
	Optional<WaitlistEntry> findWithEventById(Long id);

	/** For the job: offers whose 30 minutes are over. */
	@Query("select w.id from WaitlistEntry w where w.status = com.eventhub.waitlist.WaitlistStatus.OFFERED and w.offerExpiresAt < :now")
	List<Long> findExpiredOfferIds(@Param("now") LocalDateTime now);

}
