package com.eventhub.event;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import com.eventhub.club.ClubRepository;
import com.eventhub.tag.Tag;
import com.eventhub.tag.TagRepository;

/**
 * Reads the Flyway sample data (V2) from the real MySQL database.
 * Each test runs in a transaction that is rolled back, so the data stays clean.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class EventRepositoryTest {

	@Autowired
	private EventRepository events;

	@Autowired
	private ClubRepository clubs;

	@Autowired
	private TagRepository tags;

	@Test
	void sampleDataIsLoaded() {
		assertThat(events.count()).isEqualTo(20);
		assertThat(clubs.count()).isEqualTo(5);
		assertThat(tags.count()).isEqualTo(10);
		assertThat(events.countByStatus(EventStatus.PUBLISHED)).isEqualTo(16);
	}

	@Test
	void eventLoadsItsClubAndTags() {
		Event techFest = events.findWithDetailsById(1L).orElseThrow();

		assertThat(techFest.getTitle()).isEqualTo("Tech Fest 2026");
		assertThat(techFest.getClub().getName()).isEqualTo("Coding Club");
		assertThat(techFest.getTags()).extracting(Tag::getName).containsExactlyInAnyOrder("tech", "coding");
	}

	@Test
	void findsClubBySlug() {
		assertThat(clubs.findBySlug("robotics-club")).get()
			.extracting(club -> club.getName()).isEqualTo("Robotics Club");
	}

	@Test
	void publishedEventsAreSortedByDate() {
		var published = events.findByStatusOrderByStartTimeAsc(EventStatus.PUBLISHED);

		assertThat(published).hasSize(16);
		assertThat(published.getFirst().getTitle()).isEqualTo("Intro to Git and GitHub");
	}

}
