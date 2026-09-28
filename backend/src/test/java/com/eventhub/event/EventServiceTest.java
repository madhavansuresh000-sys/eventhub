package com.eventhub.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.common.BusinessRuleException;
import com.eventhub.common.ResourceNotFoundException;
import com.eventhub.event.dto.EventDetailResponse;
import com.eventhub.event.dto.EventRequest;

/**
 * Tests the business rules against the real MySQL database.
 * @Transactional rolls every test back, so the sample data never changes.
 */
@SpringBootTest
@Transactional
class EventServiceTest {

	private static final LocalDateTime START = LocalDateTime.now().plusDays(30).withNano(0);

	@Autowired
	private EventService service;

	@Autowired
	private EventRepository events;

	private EventRequest request(int seats, List<String> tags) {
		return new EventRequest(1L, "  Java Meetup  ", "Talks about Java 25", "Seminar Hall A",
				START, START.plusHours(3), seats, new BigDecimal("0.00"), tags);
	}

	@Test
	void createStartsAsDraftWithAllSeatsFree() {
		EventDetailResponse created = service.create(request(50, List.of("Tech", "coding")));

		assertThat(created.id()).isNotNull();
		assertThat(created.status()).isEqualTo(EventStatus.DRAFT);
		assertThat(created.title()).isEqualTo("Java Meetup");
		assertThat(created.availableSeats()).isEqualTo(50);
		assertThat(created.club().name()).isEqualTo("Coding Club");
		assertThat(created.tags()).containsExactly("coding", "tech");
	}

	@Test
	void endTimeMustBeAfterStartTime() {
		EventRequest bad = new EventRequest(1L, "Bad", null, "Hall", START, START.minusHours(1), 10,
				BigDecimal.ZERO, List.of());

		assertThatThrownBy(() -> service.create(bad))
			.isInstanceOf(BusinessRuleException.class)
			.hasMessageContaining("endTime must be after startTime");
	}

	@Test
	void unknownTagsAreRejected() {
		assertThatThrownBy(() -> service.create(request(10, List.of("tech", "cooking"))))
			.isInstanceOf(BusinessRuleException.class)
			.hasMessage("Unknown tags: cooking");
	}

	@Test
	void unknownClubIsNotFound() {
		EventRequest noClub = new EventRequest(99L, "X", null, "Hall", START, START.plusHours(1), 10,
				BigDecimal.ZERO, List.of());

		assertThatThrownBy(() -> service.create(noClub))
			.isInstanceOf(ResourceNotFoundException.class)
			.hasMessage("Club 99 not found");
	}

	@Test
	void missingEventIsNotFound() {
		assertThatThrownBy(() -> service.getEvent(999L))
			.isInstanceOf(ResourceNotFoundException.class)
			.hasMessage("Event 999 not found");
	}

	@Test
	void updateKeepsBookedSeats() {
		// Tech Fest (id 1): 200 seats, 40 available -> 160 booked
		EventDetailResponse updated = service.update(1L, request(250, List.of("tech")));

		assertThat(updated.totalSeats()).isEqualTo(250);
		assertThat(updated.availableSeats()).isEqualTo(90);
	}

	@Test
	void cannotReduceSeatsBelowBooked() {
		assertThatThrownBy(() -> service.update(1L, request(100, List.of("tech"))))
			.isInstanceOf(BusinessRuleException.class)
			.hasMessage("totalSeats cannot be less than the 160 seats already booked");
	}

	@Test
	void cannotEditEventWaitingForApproval() {
		// Street Play Festival (id 9) is PENDING_APPROVAL
		assertThat(events.findById(9L).orElseThrow().getStatus()).isEqualTo(EventStatus.PENDING_APPROVAL);

		assertThatThrownBy(() -> service.update(9L, request(500, List.of())))
			.isInstanceOf(BusinessRuleException.class)
			.hasMessageContaining("waiting for approval");
	}

}
