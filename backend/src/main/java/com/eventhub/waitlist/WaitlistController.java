package com.eventhub.waitlist;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.auth.CurrentUser;
import com.eventhub.booking.BookingService;
import com.eventhub.booking.dto.BookingResponse;
import com.eventhub.waitlist.dto.JoinWaitlistRequest;
import com.eventhub.waitlist.dto.WaitlistResponse;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

/** A student's own waitlist places. Login required; someone else's entry id gives 404. */
@RestController
@RequestMapping("/api/waitlist")
@RequiredArgsConstructor
public class WaitlistController {

	private final WaitlistService service;

	private final BookingService bookings;

	@PostMapping
	public ResponseEntity<WaitlistResponse> join(@AuthenticationPrincipal CurrentUser user,
			@Valid @RequestBody JoinWaitlistRequest request) {
		WaitlistResponse entry = service.join(user.id(), request.eventId(), request.quantity());
		return ResponseEntity.created(URI.create("/api/waitlist/" + entry.id())).body(entry);
	}

	@GetMapping("/mine")
	public List<WaitlistResponse> mine(@AuthenticationPrincipal CurrentUser user) {
		return service.mine(user.id());
	}

	@GetMapping("/{id}")
	public WaitlistResponse get(@AuthenticationPrincipal CurrentUser user, @PathVariable Long id) {
		return service.get(user.id(), id);
	}

	@PostMapping("/{id}/leave")
	public WaitlistResponse leave(@AuthenticationPrincipal CurrentUser user, @PathVariable Long id) {
		return service.leave(user.id(), id);
	}

	/** Take the kept seats: answers with the new booking (paid event: HELD -> go to checkout). */
	@PostMapping("/{id}/accept")
	public ResponseEntity<BookingResponse> accept(@AuthenticationPrincipal CurrentUser user, @PathVariable Long id) {
		BookingResponse booking = bookings.acceptOffer(user.id(), id);
		return ResponseEntity.created(URI.create("/api/bookings/" + booking.id())).body(booking);
	}

}
