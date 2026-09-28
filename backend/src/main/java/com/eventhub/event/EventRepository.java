package com.eventhub.event;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * Reads and saves events. JpaSpecificationExecutor lets us build search filters
 * (text, tag, club, date) in Step 7.
 */
public interface EventRepository extends JpaRepository<Event, Long>, JpaSpecificationExecutor<Event> {

	/** Loads the club and tags in the same query (avoids the "N+1 queries" problem). */
	@EntityGraph(attributePaths = { "club", "tags" })
	Optional<Event> findWithDetailsById(Long id);

	List<Event> findByStatusOrderByStartTimeAsc(EventStatus status);

	long countByStatus(EventStatus status);

}
