package com.eventhub.event;

import java.net.URI;
import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.common.PageResponse;
import com.eventhub.event.dto.EventDetailResponse;
import com.eventhub.event.dto.EventFilter;
import com.eventhub.event.dto.EventRequest;
import com.eventhub.event.dto.EventSummaryResponse;
import com.eventhub.event.dto.ReviewRequest;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

/** Event URLs. The controller only reads the request and calls the service. */
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

	private final EventService service;

	/**
	 * Example: GET /api/events?tag=tech&from=2026-10-01&to=2026-10-31&sort=date&dir=asc&page=0&size=10
	 */
	@GetMapping
	public PageResponse<EventSummaryResponse> search(
			@RequestParam(required = false) String q,
			@RequestParam(required = false) String tag,
			@RequestParam(required = false) String club,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(defaultValue = "date") String sort,
			@RequestParam(defaultValue = "asc") String dir) {
		return service.search(new EventFilter(q, tag, club, from, to), page, size, sort, dir);
	}

	@GetMapping("/{id}")
	public EventDetailResponse get(@PathVariable Long id) {
		return service.getPublishedEvent(id);
	}

	/** Creates a DRAFT event. Returns 201 Created with the new event's URL. */
	@PostMapping
	public ResponseEntity<EventDetailResponse> create(@Valid @RequestBody EventRequest request) {
		EventDetailResponse created = service.create(request);
		return ResponseEntity.created(URI.create("/api/events/" + created.id())).body(created);
	}

	@PutMapping("/{id}")
	public EventDetailResponse update(@PathVariable Long id, @Valid @RequestBody EventRequest request) {
		return service.update(id, request);
	}

	// ---------- Approval workflow ----------

	/** Organizer sends a DRAFT for review. */
	@PostMapping("/{id}/submit")
	public EventDetailResponse submit(@PathVariable Long id) {
		return service.submit(id);
	}

	/** Admin publishes an event that is waiting for approval. */
	@PostMapping("/{id}/approve")
	public EventDetailResponse approve(@PathVariable Long id) {
		return service.approve(id);
	}

	/** Admin sends it back to DRAFT. Body: {"reason": "Please add the venue map"} */
	@PostMapping("/{id}/reject")
	public EventDetailResponse reject(@PathVariable Long id, @Valid @RequestBody ReviewRequest review) {
		return service.reject(id, review.reason());
	}

}
