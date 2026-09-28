package com.eventhub.event;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eventhub.club.Club;
import com.eventhub.club.ClubRepository;
import com.eventhub.common.BusinessRuleException;
import com.eventhub.common.ResourceNotFoundException;
import com.eventhub.event.dto.EventDetailResponse;
import com.eventhub.event.dto.EventMapper;
import com.eventhub.event.dto.EventRequest;
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
