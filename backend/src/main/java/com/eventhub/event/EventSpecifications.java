package com.eventhub.event;

import java.time.LocalDate;

import org.springframework.data.jpa.domain.Specification;

import com.eventhub.club.Club;
import com.eventhub.event.dto.EventFilter;
import com.eventhub.tag.Tag;

import jakarta.persistence.criteria.Join;

/**
 * Small reusable "WHERE" pieces. The service joins the ones the user asked for,
 * e.g. published AND has tag "tech" AND starts after 1 Oct.
 */
public final class EventSpecifications {

	private EventSpecifications() {
	}

	/** Builds the full search from the filter; blank options are skipped. */
	public static Specification<Event> publishedMatching(EventFilter f) {
		Specification<Event> spec = hasStatus(EventStatus.PUBLISHED);
		if (hasText(f.q())) {
			spec = spec.and(textContains(f.q().trim()));
		}
		if (hasText(f.tag())) {
			spec = spec.and(hasTag(f.tag().trim().toLowerCase()));
		}
		if (hasText(f.club())) {
			spec = spec.and(inClub(f.club().trim().toLowerCase()));
		}
		if (f.from() != null) {
			spec = spec.and(startsOnOrAfter(f.from()));
		}
		if (f.to() != null) {
			spec = spec.and(startsOnOrBefore(f.to()));
		}
		return spec;
	}

	static Specification<Event> hasStatus(EventStatus status) {
		return (root, query, cb) -> cb.equal(root.get("status"), status);
	}

	/** Case-insensitive search in title or description. */
	static Specification<Event> textContains(String text) {
		String pattern = "%" + text.toLowerCase() + "%";
		return (root, query, cb) -> cb.or(
				cb.like(cb.lower(root.get("title")), pattern),
				cb.like(cb.lower(root.get("description")), pattern));
	}

	static Specification<Event> hasTag(String tagName) {
		return (root, query, cb) -> {
			Join<Event, Tag> tags = root.join("tags");
			return cb.equal(tags.get("name"), tagName);
		};
	}

	static Specification<Event> inClub(String slug) {
		return (root, query, cb) -> {
			Join<Event, Club> club = root.join("club");
			return cb.equal(club.get("slug"), slug);
		};
	}

	static Specification<Event> startsOnOrAfter(LocalDate day) {
		return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("startTime"), day.atStartOfDay());
	}

	/** "to" is inclusive: everything before the start of the next day. */
	static Specification<Event> startsOnOrBefore(LocalDate day) {
		return (root, query, cb) -> cb.lessThan(root.get("startTime"), day.plusDays(1).atStartOfDay());
	}

	private static boolean hasText(String s) {
		return s != null && !s.isBlank();
	}

}
