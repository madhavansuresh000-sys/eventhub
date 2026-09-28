package com.eventhub.payment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventhub.auth.CurrentUser;
import com.eventhub.booking.BookingService;
import com.eventhub.booking.BookingService.TestPayment;
import com.eventhub.booking.dto.BookingResponse;
import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;

/**
 * Messages about payments.
 *   POST /api/payments/stripe/webhook   Stripe's server calls this (no login; the SIGNATURE proves it is Stripe)
 *   POST /api/payments/{session}/verify the student is back from Stripe: ask Stripe directly
 *   GET/POST /api/payments/fake/...     the dev test payment page (only without Stripe keys)
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

	private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

	private final BookingService bookings;

	private final String webhookSecret;

	public PaymentController(BookingService bookings, @Value("${app.stripe.webhook-secret:}") String webhookSecret) {
		this.bookings = bookings;
		this.webhookSecret = webhookSecret;
	}

	/**
	 * Step 7: Stripe tells us a checkout was paid. Anyone on the internet can call this URL, so we
	 * FIRST check the Stripe-Signature header: an HMAC made with the webhook secret that only
	 * Stripe and we know. Wrong signature -> 400, and nothing is changed.
	 * We answer 200 quickly for every genuine message (also duplicates), otherwise Stripe sends it again.
	 */
	@PostMapping("/stripe/webhook")
	public ResponseEntity<String> stripeWebhook(@RequestBody String payload,
			@RequestHeader(name = "Stripe-Signature", required = false) String signature) {
		if (webhookSecret.isBlank()) {
			return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("Stripe webhook secret is not configured");
		}
		com.stripe.model.Event event;
		try {
			event = Webhook.constructEvent(payload, signature, webhookSecret);
		}
		catch (SignatureVerificationException | RuntimeException ex) {
			log.warn("Rejected a webhook with a bad signature");
			return ResponseEntity.badRequest().body("Invalid signature");
		}

		String type = event.getType();
		if ("checkout.session.completed".equals(type) || "checkout.session.async_payment_succeeded".equals(type)) {
			Session session = (Session) dataObject(event);
			if ("paid".equals(session.getPaymentStatus())) {
				BookingService.PaidResult result = bookings.markPaid(event.getId(), session.getId());
				log.info("Stripe {} for session {}: {}", type, session.getId(), result);
			}
		}
		return ResponseEntity.ok("received");
	}

	/** Stripe may send data in a newer format than this library knows; the fields we read still work. */
	private static StripeObject dataObject(com.stripe.model.Event event) {
		var data = event.getDataObjectDeserializer();
		return data.getObject().orElseGet(() -> {
			try {
				return data.deserializeUnsafe();
			}
			catch (EventDataObjectDeserializationException ex) {
				throw new IllegalStateException("Cannot read Stripe event " + event.getId(), ex);
			}
		});
	}

	/** Back from the Stripe page: confirm now if Stripe says paid (we do not have to wait for the webhook). */
	@PostMapping("/{sessionId}/verify")
	public BookingResponse verify(@AuthenticationPrincipal CurrentUser user, @PathVariable String sessionId) {
		return bookings.verify(user.id(), sessionId);
	}

	// ---------- dev test payment page ----------

	@GetMapping("/fake/{sessionId}")
	public TestPayment testPayment(@AuthenticationPrincipal CurrentUser user, @PathVariable String sessionId) {
		return bookings.testPayment(user.id(), sessionId);
	}

	@PostMapping("/fake/{sessionId}/complete")
	public BookingResponse completeTestPayment(@AuthenticationPrincipal CurrentUser user, @PathVariable String sessionId) {
		return bookings.completeTestPayment(user.id(), sessionId);
	}

}
