package com.eventhub.event;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.event.dto.ClubStatsResponse;
import com.eventhub.event.dto.EventDetailResponse;

import lombok.RequiredArgsConstructor;

/**
 * Admin screens. Approve / reject stay at POST /api/events/{id}/approve and /reject (Phase 2).
 * Everything under /api/admin/** is locked to admins in Phase 5.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminEventController {

	private final EventService service;

	/** The approval queue: events waiting for approval, soonest first. */
	@GetMapping("/events/pending")
	public List<EventDetailResponse> pendingEvents() {
		return service.pendingEvents();
	}

	/** The admin overview table: one row per club. */
	@GetMapping("/stats/clubs")
	public List<ClubStatsResponse> clubStats() {
		return service.clubStats();
	}

}
