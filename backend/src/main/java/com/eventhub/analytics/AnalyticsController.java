package com.eventhub.analytics;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.analytics.dto.AnalyticsResponse;
import com.eventhub.common.BadRequestException;

import lombok.RequiredArgsConstructor;

/** Phase 7 step 7: dashboard numbers. Organizers see their own club; the admin sees all clubs or one. */
@RestController
@RequiredArgsConstructor
public class AnalyticsController {

	private static final int MAX_DAYS = 365;

	private final AnalyticsService service;

	/** Organizers of this club only. */
	@GetMapping("/api/organizer/clubs/{clubId}/analytics")
	@PreAuthorize("@clubAccess.isOrganizer(#clubId)")
	public AnalyticsResponse club(@PathVariable Long clubId, @RequestParam(defaultValue = "30") int days) {
		return service.dashboard(clubId, checked(days));
	}

	/** ADMIN only (SecurityConfig: /api/admin/**). No clubId = every club together. */
	@GetMapping("/api/admin/analytics")
	public AnalyticsResponse all(@RequestParam(required = false) Long clubId,
			@RequestParam(defaultValue = "30") int days) {
		return service.dashboard(clubId, checked(days));
	}

	private static int checked(int days) {
		if (days < 1 || days > MAX_DAYS) {
			throw new BadRequestException("days must be between 1 and " + MAX_DAYS + ".");
		}
		return days;
	}

}
