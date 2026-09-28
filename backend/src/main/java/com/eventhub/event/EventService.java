package com.eventhub.event;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.club.Club;
import com.eventhub.club.ClubRepository;
import com.eventhub.common.BadRequestException;
import com.eventhub.common.BusinessRuleException;
import com.eventhub.common.PageResponse;
import com.eventhub.common.ResourceNotFoundException;
import com.eventhub.event.dto.EventDetailResponse;
import com.eventhub.event.dto.EventFilter;
import com.eventhub.event.dto.EventMapper;
import com.eventhub.event.dto.EventRequest;
import com.eventhub.event.dto.EventSummaryResponse;
import com.eventhub.tag.Tag;
import com.eventhub.tag.TagRepository;

import lombok.RequiredArgsConstructor;

/**
 * Business rules for events. Controllers call this; it talks to the repositories
 * and always returns DTOs (never entities).
 */
@Service
@RequiredArgsConstructor
public class EventService {

	private final EventRepository events;

	private final ClubRepository clubs;

	private final TagRepository tags;

	/** Sort options the API accepts, mapped to entity fields. */
	private static final Map<String, String> SORT_FIELDS = Map.of(
			"date", "startTime",
			"price", "price",
			"title", "title");

	static final int MAX_PAGE_SIZE = 50;

	/** Public list: only PUBLISHED events, with optional filters, sort and pages. */
	@Transactional(readOnly = true)
	public PageResponse<EventSummaryResponse> search(EventFilter filter, int page, int size, String sort, String dir) {
		if (page < 0) {
			throw new BadRequestException("page must be 0 or more");
		}
		if (size < 1 || size > MAX_PAGE_SIZE) {
			throw new BadRequestException("size must be between 1 and " + MAX_PAGE_SIZE);
		}
		if (filter.from() != null && filter.to() != null && filter.to().isBefore(filter.from())) {
			throw new BadRequestException("to must be on or after from");
		}
		String field = SORT_FIELDS.get(sort);
		if (field == null) {
			throw new BadRequestException("sort must be one of: date, price, title");
		}
		Sort.Direction direction = switch (dir.toLowerCase()) {
			case "asc" -> Sort.Direction.ASC;
			case "desc" -> Sort.Direction.DESC;
			default -> throw new BadRequestException("dir must be asc or desc");
		};

		// id as a tie-breaker keeps the order stable between pages
		Pageable pageable = PageRequest.of(page, size, Sort.by(direction, field).and(Sort.by("id")));
		Page<Event> result = events.findAll(EventSpecifications.publishedMatching(filter), pageable);
		return PageResponse.from(result, EventMapper::toSummary);
	}

	/** Public details: drafts and events under review are hidden (404). */
	@Transactional(readOnly = true)
	public EventDetailResponse getPublishedEvent(Long id) {
		Event event = findEvent(id);
		if (event.getStatus() != EventStatus.PUBLISHED) {
			throw new ResourceNotFoundException("Event", id);
		}
		return EventMapper.toDetail(event);
	}

	/** Any status (for organizers and admins). */
	@Transactional(readOnly = true)
	public EventDetailResponse getEvent(Long id) {
		return EventMapper.toDetail(findEvent(id));
	}

	/** New events always start as DRAFT with every seat free. */
	@Transactional
	public EventDetailResponse create(EventRequest request) {
		checkTimes(request);

		Event event = new Event();
		event.setStatus(EventStatus.DRAFT);
		event.setAvailableSeats(request.totalSeats());
		applyRequest(event, request);

		return EventMapper.toDetail(events.save(event));
	}

	/**
	 * Rules: an event under review cannot be edited, and seats cannot be
	 * reduced below the number already booked.
	 */
	@Transactional
	public EventDetailResponse update(Long id, EventRequest request) {
		Event event = findEvent(id);
		checkTimes(request);

		if (event.getStatus() == EventStatus.PENDING_APPROVAL) {
			throw new BusinessRuleException("Event " + id + " is waiting for approval and cannot be edited");
		}

		int booked = event.getTotalSeats() - event.getAvailableSeats();
		if (request.totalSeats() < booked) {
			throw new BusinessRuleException(
					"totalSeats cannot be less than the " + booked + " seats already booked");
		}
		event.setAvailableSeats(request.totalSeats() - booked);
		applyRequest(event, request);

		return EventMapper.toDetail(event);
	}

	Event findEvent(Long id) {
		return events.findWithDetailsById(id)
			.orElseThrow(() -> new ResourceNotFoundException("Event", id));
	}

	private void applyRequest(Event event, EventRequest request) {
		Club club = clubs.findById(request.clubId())
			.orElseThrow(() -> new ResourceNotFoundException("Club", request.clubId()));

		event.setClub(club);
		event.setTitle(request.title().trim());
		event.setDescription(request.description());
		event.setVenue(request.venue().trim());
		event.setStartTime(request.startTime());
		event.setEndTime(request.endTime());
		event.setTotalSeats(request.totalSeats());
		event.setPrice(request.price());
		event.setTags(findTags(request.tags()));
	}

	private void checkTimes(EventRequest request) {
		if (!request.endTime().isAfter(request.startTime())) {
			throw new BusinessRuleException("endTime must be after startTime");
		}
	}

	/** Tag names are matched in lower case; unknown tags are an error, not silently dropped. */
	private Set<Tag> findTags(List<String> names) {
		if (names == null || names.isEmpty()) {
			return new HashSet<>();
		}
		Set<String> wanted = new TreeSet<>();
		names.forEach(n -> wanted.add(n.trim().toLowerCase()));

		List<Tag> found = tags.findByNameIn(wanted);
		if (found.size() != wanted.size()) {
			found.forEach(t -> wanted.remove(t.getName()));
			throw new BusinessRuleException("Unknown tags: " + String.join(", ", wanted));
		}
		return new HashSet<>(found);
	}

}
