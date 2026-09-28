package com.eventhub.booking;

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
import com.eventhub.booking.dto.BookingRequest;
import com.eventhub.booking.dto.BookingResponse;
import com.eventhub.booking.dto.CheckoutResponse;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

/**
 * A student's own bookings. Login required (SecurityConfig); every method works only on
 * the logged-in user's bookings (someone else's booking id gives 404).
 */
@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

	private final BookingService service;

	/** Hold seats: 201 with the booking (HELD with a timer, or CONFIRMED for a free event). */
	@PostMapping
	public ResponseEntity<BookingResponse> hold(@AuthenticationPrincipal CurrentUser user,
			@Valid @RequestBody BookingRequest request) {
		BookingResponse booking = service.hold(user.id(), request.eventId(), request.quantity());
		return ResponseEntity.created(URI.create("/api/bookings/" + booking.id())).body(booking);
	}

	@GetMapping("/mine")
	public List<BookingResponse> mine(@AuthenticationPrincipal CurrentUser user) {
		return service.mine(user.id());
	}

	@GetMapping("/{id}")
	public BookingResponse get(@AuthenticationPrincipal CurrentUser user, @PathVariable Long id) {
		return service.get(user.id(), id);
	}

	/** Start paying for a HELD booking: answers with the payment page to send the student to. */
	@PostMapping("/{id}/pay")
	public CheckoutResponse pay(@AuthenticationPrincipal CurrentUser user, @PathVariable Long id) {
		return service.pay(user.id(), id);
	}

	@PostMapping("/{id}/cancel")
	public BookingResponse cancel(@AuthenticationPrincipal CurrentUser user, @PathVariable Long id) {
		return service.cancel(user.id(), id);
	}

}
