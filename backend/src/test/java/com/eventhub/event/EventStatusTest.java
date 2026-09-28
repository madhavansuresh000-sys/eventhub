package com.eventhub.event;

import static com.eventhub.event.EventStatus.DRAFT;
import static com.eventhub.event.EventStatus.PENDING_APPROVAL;
import static com.eventhub.event.EventStatus.PUBLISHED;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** The state machine on its own: no Spring, no database. */
class EventStatusTest {

	@Test
	void allowedMoves() {
		assertThat(DRAFT.canMoveTo(PENDING_APPROVAL)).isTrue();
		assertThat(PENDING_APPROVAL.canMoveTo(PUBLISHED)).isTrue();
		assertThat(PENDING_APPROVAL.canMoveTo(DRAFT)).isTrue();
	}

	@Test
	void forbiddenMoves() {
		assertThat(DRAFT.canMoveTo(PUBLISHED)).as("cannot skip the review").isFalse();
		assertThat(PUBLISHED.canMoveTo(DRAFT)).isFalse();
		assertThat(PUBLISHED.canMoveTo(PENDING_APPROVAL)).isFalse();
		assertThat(DRAFT.canMoveTo(DRAFT)).isFalse();
	}

}
