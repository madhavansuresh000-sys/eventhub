package com.eventhub.event;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.eventhub.event.dto.ClubStatsResponse;

/**
 * Reads and saves events. JpaSpecificationExecutor lets us build search filters
 * (text, tag, club, date) in Step 7.
 */
public interface EventRepository extends JpaRepository<Event, Long>, JpaSpecificationExecutor<Event> {

	/** Loads the club and tags in the same query (avoids the "N+1 queries" problem). */
	@EntityGraph(attributePaths = { "club", "tags" })
	Optional<Event> findWithDetailsById(Long id);

	/**
	 * Search with paging. The club is loaded in the same query; tags are loaded
	 * in one extra batch query (see @BatchSize on Event.tags).
	 */
	@Override
	@EntityGraph(attributePaths = "club")
	Page<Event> findAll(Specification<Event> spec, Pageable pageable);

	/** Admin approval queue: every event with this status, soonest first. */
	@EntityGraph(attributePaths = "club")
	List<Event> findByStatusOrderByStartTimeAsc(EventStatus status);

	/** Organizer dashboard: all of one club's events, whatever their status. */
	@EntityGraph(attributePaths = "club")
	List<Event> findByClubIdOrderByStartTimeAsc(Long clubId);

	/**
	 * Admin overview: one row per club, counted by the database in ONE query (GROUP BY),
	 * instead of loading every event into Java. LEFT JOIN keeps clubs that have no events.
	 */
	@Query("""
			select new com.eventhub.event.dto.ClubStatsResponse(
				c.id, c.name, c.slug,
				sum(case when e.status = :published then 1L else 0L end),
				sum(case when e.status = :pending then 1L else 0L end),
				sum(case when e.status = :published then e.totalSeats - e.availableSeats else 0 end),
				coalesce(sum(case when e.status = :published then (e.totalSeats - e.availableSeats) * e.price end), 0))
			from Club c left join Event e on e.club = c
			group by c.id, c.name, c.slug
			order by c.id
			""")
	List<ClubStatsResponse> clubStats(@Param("published") EventStatus published, @Param("pending") EventStatus pending);

	long countByStatus(EventStatus status);

}
