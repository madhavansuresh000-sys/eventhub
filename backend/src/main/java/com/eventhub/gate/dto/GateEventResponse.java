package com.eventhub.gate.dto;

import java.time.LocalDateTime;

import com.eventhub.event.Event;

/** An event the logged-in volunteer / organizer can scan tickets for. */
public record GateEventResponse(Long id, String title, String venue, LocalDateTime startTime, LocalDateTime endTime,
		String clubName, int totalSeats) {

	public static GateEventResponse from(Event e) {
		return new GateEventResponse(e.getId(), e.getTitle(), e.getVenue(), e.getStartTime(), e.getEndTime(),
				e.getClub().getName(), e.getTotalSeats());
	}

}
