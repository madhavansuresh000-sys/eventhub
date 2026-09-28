package com.eventhub.event;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.event.dto.EventDetailResponse;

import lombok.RequiredArgsConstructor;

/**
 * Organizer screens: see a club's events in EVERY status (the public URLs only show PUBLISHED).
 * Everything under /api/organizer/** is locked to organizers in Phase 5 with one security rule.
 */
@RestController
@RequestMapping("/api/organizer")
@RequiredArgsConstructor
public class OrganizerEventController {

	private final EventService service;

	/** GET /api/organizer/clubs/1/events -> drafts, waiting and published events of club 1 */
	@GetMapping("/clubs/{clubId}/events")
	public List<EventDetailResponse> clubEvents(@PathVariable Long clubId) {
		return service.clubEvents(clubId);
	}

	/** One event in any status, e.g. to fill the edit form for a draft. */
	@GetMapping("/events/{id}")
	public EventDetailResponse event(@PathVariable Long id) {
		return service.getEvent(id);
	}

}
