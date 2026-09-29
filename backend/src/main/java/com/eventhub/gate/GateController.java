package com.eventhub.gate;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.auth.CurrentUser;
import com.eventhub.gate.dto.CheckInRequest;
import com.eventhub.gate.dto.CheckInResponse;
import com.eventhub.gate.dto.GateEventResponse;
import com.eventhub.gate.dto.GateStats;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

/** The gate scanner's API. Only volunteers and organizers of the event's club. */
@RestController
@RequestMapping("/api/gate")
@RequiredArgsConstructor
public class GateController {

	private final CheckInService service;

	@GetMapping("/events")
	public List<GateEventResponse> myEvents(@AuthenticationPrincipal CurrentUser user) {
		return service.myGateEvents(user.id());
	}

	@PostMapping("/events/{eventId}/check-in")
	@PreAuthorize("@clubAccess.canScanEvent(#eventId)")
	public CheckInResponse checkIn(@AuthenticationPrincipal CurrentUser user, @PathVariable Long eventId,
			@Valid @RequestBody CheckInRequest request) {
		return service.checkIn(eventId, request.code(), user.id());
	}

	/** The live counter (the scanner and the organizer dashboard ask every few seconds). */
	@GetMapping("/events/{eventId}/stats")
	@PreAuthorize("@clubAccess.canScanEvent(#eventId)")
	public GateStats stats(@PathVariable Long eventId) {
		return service.stats(eventId);
	}

}
