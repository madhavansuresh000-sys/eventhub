package com.eventhub.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.eventhub.analytics.AnalyticsQueries.DaySales;
import com.eventhub.analytics.AnalyticsQueries.EventRating;
import com.eventhub.analytics.AnalyticsQueries.EventSales;
import com.eventhub.analytics.dto.AnalyticsResponse;

/**
 * Phase 8 step 1 - a UNIT test with Mockito: the database queries are replaced by a mock that
 * returns rows we choose, so we test only the Java maths of AnalyticsService (fast, no MySQL).
 * The real queries are tested separately in AnalyticsFlowTest (integration test).
 */
@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

	@Mock
	private AnalyticsQueries queries;

	@InjectMocks
	private AnalyticsService service;

	private static final LocalDate TODAY = LocalDate.now();

	@Test
	void daysWithoutSalesAreFilledWithZero() {
		when(queries.salesPerDay(eq(1L), any())).thenReturn(List.of(
				new DaySales(TODAY.minusDays(2), 3, new BigDecimal("300.00")),
				new DaySales(TODAY, 1, new BigDecimal("50.00"))));
		when(queries.salesPerEvent(eq(1L), any())).thenReturn(List.of());

		AnalyticsResponse r = service.dashboard(1L, 7);

		assertThat(r.perDay()).hasSize(7);
		assertThat(r.from()).isEqualTo(TODAY.minusDays(6));
		assertThat(r.perDay()).extracting(AnalyticsResponse.DayPoint::tickets).containsExactly(0L, 0L, 0L, 0L, 3L, 0L, 1L);
		assertThat(r.totals().ticketsSold()).isEqualTo(4);
		assertThat(r.totals().revenue()).isEqualByComparingTo("350");
		assertThat(r.totals().checkInRate()).isNull();   // no started event: "—", not 0 %
		assertThat(r.totals().averageRating()).isNull();
		verify(queries, never()).ratings(anyCollection()); // no events = no ratings query at all
	}

	@Test
	void checkInRateCountsOnlyStartedEventsAndStarsAreWeightedByHowManyRated() {
		LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
		LocalDateTime nextWeek = LocalDateTime.now().plusDays(7);
		when(queries.salesPerDay(any(), any())).thenReturn(List.of());
		when(queries.salesPerEvent(any(), any())).thenReturn(List.of(
				new EventSales(10L, "Git workshop", yesterday, 60, 40, 30, BigDecimal.ZERO),
				new EventSales(11L, "Robo Race", yesterday, 100, 10, 10, new BigDecimal("1000")),
				new EventSales(12L, "Tech Fest", nextWeek, 200, 150, 0, new BigDecimal("15000"))));
		when(queries.ratings(List.of(10L, 11L, 12L))).thenReturn(List.of(
				new EventRating(10L, 4.0, 3),    // 3 people gave 4 stars
				new EventRating(11L, 2.0, 1)));  // 1 person gave 2 stars

		AnalyticsResponse r = service.dashboard(null, 30);

		// started events only: (30 + 10) came of (40 + 10) sold = 80 %; Tech Fest (not started) is left out
		assertThat(r.totals().checkedIn()).isEqualTo(40);
		assertThat(r.totals().expectedAtGate()).isEqualTo(50);
		assertThat(r.totals().checkInRate()).isEqualTo(0.8);
		// (4+4+4+2) / 4 ratings = 3.5, NOT (4.0 + 2.0) / 2 events = 3.0
		assertThat(r.totals().averageRating()).isEqualTo(3.5);
		assertThat(r.totals().ratings()).isEqualTo(4);

		assertThat(r.events()).extracting(AnalyticsResponse.EventRow::started).containsExactly(true, true, false);
		assertThat(r.events().get(2).averageRating()).isNull(); // Tech Fest: no ratings yet
	}

}
