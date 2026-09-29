package com.eventhub.feedback;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

	Optional<Feedback> findByBookingId(Long bookingId);

	List<Feedback> findByUserId(Long userId);

	/** The organizer's page: newest first. */
	List<Feedback> findByEventIdOrderByCreatedAtDesc(Long eventId);

	/** How many 1-star, 2-star ... 5-star answers: rows of [rating, count], counted by the database. */
	@Query("select f.rating, count(f) from Feedback f where f.event.id = :eventId group by f.rating")
	List<Object[]> countByRating(@Param("eventId") Long eventId);

}
