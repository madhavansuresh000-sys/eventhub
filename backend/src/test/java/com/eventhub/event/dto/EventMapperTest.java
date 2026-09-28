package com.eventhub.event.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.eventhub.club.Club;
import com.eventhub.event.Event;
import com.eventhub.event.EventStatus;
import com.eventhub.tag.Tag;

/** Plain unit test: no Spring, no database. */
class EventMapperTest {

	private Event sampleEvent() {
		Club club = new Club();
		club.setId(1L);
		club.setName("Coding Club");
		club.setSlug("coding-club");

		Tag tech = new Tag();
		tech.setName("tech");
		Tag coding = new Tag();
		coding.setName("coding");

		Event e = new Event();
		e.setId(7L);
		e.setClub(club);
		e.setTitle("Dance Night");
		e.setDescription("Dance battle");
		e.setVenue("Open Air Theatre");
		e.setStartTime(LocalDateTime.of(2026, 10, 15, 18, 0));
		e.setEndTime(LocalDateTime.of(2026, 10, 15, 22, 0));
		e.setTotalSeats(300);
		e.setAvailableSeats(0);
		e.setPrice(new BigDecimal("120.00"));
		e.setStatus(EventStatus.PUBLISHED);
		e.setTags(Set.of(tech, coding));
		return e;
	}

	@Test
	void summaryHasCardFieldsAndSortedTags() {
		EventSummaryResponse dto = EventMapper.toSummary(sampleEvent());

		assertThat(dto.title()).isEqualTo("Dance Night");
		assertThat(dto.clubName()).isEqualTo("Coding Club");
		assertThat(dto.tags()).containsExactly("coding", "tech");
		assertThat(dto.soldOut()).isTrue();
	}

	@Test
	void detailIncludesClubAndDescription() {
		EventDetailResponse dto = EventMapper.toDetail(sampleEvent());

		assertThat(dto.club().slug()).isEqualTo("coding-club");
		assertThat(dto.description()).isEqualTo("Dance battle");
		assertThat(dto.endTime()).isEqualTo(LocalDateTime.of(2026, 10, 15, 22, 0));
	}

}
