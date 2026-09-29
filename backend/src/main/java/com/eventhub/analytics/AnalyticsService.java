package com.eventhub.analytics;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.analytics.AnalyticsQueries.DaySales;
import com.eventhub.analytics.AnalyticsQueries.EventRating;
import com.eventhub.analytics.AnalyticsQueries.EventSales;
import com.eventhub.analytics.dto.AnalyticsResponse;
import com.eventhub.analytics.dto.AnalyticsResponse.DayPoint;
import com.eventhub.analytics.dto.AnalyticsResponse.EventRow;
import com.eventhub.analytics.dto.AnalyticsResponse.Totals;

import lombok.RequiredArgsConstructor;

/**
 * Phase 7 step 7: the numbers behind the charts - tickets and money per day, check-in rate, ratings.
 *
 * @Cacheable: the first call counts in the database and keeps the answer in memory (Caffeine) for 60 s.
 * Every call in the next 60 s with the same club + days gets that saved answer without touching MySQL.
 * The price: a new booking shows up on the dashboard up to 1 minute later - fine for charts, NOT fine
 * for seat counts (those are never cached).
 */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

	/** The name of the cache, also listed in application.yml (spring.cache.cache-names). */
	public static final String CACHE = "analytics";

	private final AnalyticsQueries queries;

	/**
	 * @param clubId one club, or null = all clubs
	 * @param days   the last N days, today included
	 */
	@Cacheable(cacheNames = CACHE, key = "(#clubId ?: 'all') + ':' + #days")
	@Transactional(readOnly = true)
	public AnalyticsResponse dashboard(Long clubId, int days) {
		LocalDateTime now = LocalDateTime.now();
		LocalDate to = now.toLocalDate();
		LocalDate from = to.minusDays(days - 1L);

		List<DayPoint> perDay = everyDay(from, to, queries.salesPerDay(clubId, from.atStartOfDay()));
		List<EventRow> events = withRatings(queries.salesPerEvent(clubId, from.atStartOfDay()), now);

		return new AnalyticsResponse(from, to, days, now, totals(perDay, events), perDay, events);
	}

	/** The database only returns days that had sales; charts need every day (a gap = 0, not "missing"). */
	private static List<DayPoint> everyDay(LocalDate from, LocalDate to, List<DaySales> sales) {
		Map<LocalDate, DaySales> byDate = sales.stream().collect(Collectors.toMap(DaySales::date, Function.identity()));
		List<DayPoint> points = new ArrayList<>();
		for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
			DaySales s = byDate.get(day);
			points.add(s == null ? new DayPoint(day, 0, BigDecimal.ZERO) : new DayPoint(day, s.tickets(), s.revenue()));
		}
		return List.copyOf(points);
	}

	private List<EventRow> withRatings(List<EventSales> sales, LocalDateTime now) {
		Map<Long, EventRating> ratings = sales.isEmpty() ? Map.of()
				: queries.ratings(sales.stream().map(EventSales::eventId).toList()).stream()
					.collect(Collectors.toMap(EventRating::eventId, Function.identity()));
		return sales.stream().map(s -> {
			EventRating r = ratings.get(s.eventId());
			return new EventRow(s.eventId(), s.title(), s.startTime(), !s.startTime().isAfter(now), s.totalSeats(),
					s.ticketsSold(), s.checkedIn(), s.revenue(), r == null ? null : round(r.average()),
					r == null ? 0 : r.count());
		}).toList();
	}

	private static Totals totals(List<DayPoint> perDay, List<EventRow> events) {
		long tickets = perDay.stream().mapToLong(DayPoint::tickets).sum();
		BigDecimal revenue = perDay.stream().map(DayPoint::revenue).reduce(BigDecimal.ZERO, BigDecimal::add);

		// check-in rate: only events whose gate is already open; for future events nobody could come yet
		long checkedIn = events.stream().filter(EventRow::started).mapToLong(EventRow::checkedIn).sum();
		long expected = events.stream().filter(EventRow::started).mapToLong(EventRow::ticketsSold).sum();

		// average of all ratings (an event with 10 ratings weighs more than one with 1)
		long ratings = events.stream().mapToLong(EventRow::ratings).sum();
		double stars = events.stream().filter(e -> e.ratings() > 0).mapToDouble(e -> e.averageRating() * e.ratings()).sum();

		return new Totals(tickets, revenue, checkedIn, expected,
				expected == 0 ? null : round((double) checkedIn / expected),
				ratings == 0 ? null : round(stars / ratings), ratings);
	}

	private static double round(double value) {
		return Math.round(value * 100) / 100.0;
	}

}
