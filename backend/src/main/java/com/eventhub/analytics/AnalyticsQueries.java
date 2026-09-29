package com.eventhub.analytics;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.eventhub.booking.Booking;

/**
 * The dashboard's counting queries. The database does the adding up (GROUP BY, SUM, AVG),
 * so Java receives a few small rows instead of every booking.
 *
 * clubId = null means "all clubs" (admin); ":clubId is null or ..." switches the club filter off.
 * Only CONFIRMED bookings count: held ones are not paid yet, cancelled / expired ones are gone.
 */
public interface AnalyticsQueries extends Repository<Booking, Long> {

	/** Tickets and money per day, by the day the booking was paid. Days without sales are missing (added in Java). */
	@Query("""
			select new com.eventhub.analytics.AnalyticsQueries$DaySales(
				cast(b.confirmedAt as LocalDate), sum(b.quantity), sum(b.amount))
			from Booking b
			where b.status = com.eventhub.booking.BookingStatus.CONFIRMED
				and b.confirmedAt >= :from
				and (:clubId is null or b.event.club.id = :clubId)
			group by cast(b.confirmedAt as LocalDate)
			order by cast(b.confirmedAt as LocalDate)
			""")
	List<DaySales> salesPerDay(@Param("clubId") Long clubId, @Param("from") LocalDateTime from);

	/**
	 * One row per published event starting on or after `from`. LEFT JOIN keeps events with no bookings (0 sold).
	 * The booking condition sits in the ON part, not in WHERE - in WHERE it would drop those events again.
	 */
	@Query("""
			select new com.eventhub.analytics.AnalyticsQueries$EventSales(
				e.id, e.title, e.startTime, e.totalSeats,
				coalesce(sum(b.quantity), 0L),
				coalesce(sum(case when b.checkedInAt is not null then b.quantity else 0 end), 0L),
				coalesce(sum(b.amount), 0))
			from Event e
				left join Booking b on b.event = e and b.status = com.eventhub.booking.BookingStatus.CONFIRMED
			where e.status = com.eventhub.event.EventStatus.PUBLISHED
				and e.startTime >= :from
				and (:clubId is null or e.club.id = :clubId)
			group by e.id, e.title, e.startTime, e.totalSeats
			order by e.startTime
			""")
	List<EventSales> salesPerEvent(@Param("clubId") Long clubId, @Param("from") LocalDateTime from);

	/** Average stars and number of ratings of these events (events without ratings are missing). */
	@Query("""
			select new com.eventhub.analytics.AnalyticsQueries$EventRating(f.event.id, avg(f.rating), count(f))
			from Feedback f
			where f.event.id in :eventIds
			group by f.event.id
			""")
	List<EventRating> ratings(@Param("eventIds") Collection<Long> eventIds);

	record DaySales(LocalDate date, long tickets, BigDecimal revenue) {
	}

	record EventSales(Long eventId, String title, LocalDateTime startTime, int totalSeats, long ticketsSold,
			long checkedIn, BigDecimal revenue) {
	}

	record EventRating(Long eventId, double average, long count) {
	}

}
