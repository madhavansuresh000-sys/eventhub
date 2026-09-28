package com.eventhub.payment;

import com.eventhub.booking.Booking;

/**
 * The outside payment company, behind one small interface (like a plug socket):
 *   StripePaymentGateway - real Stripe Checkout in test mode (when STRIPE_SECRET_KEY is in .env)
 *   FakePaymentGateway   - a built-in test page for development (no keys needed)
 * The booking code only talks to this interface, so it works the same with both.
 */
public interface PaymentGateway {

	PaymentProvider provider();

	/** Starts a checkout for a HELD booking. The student is sent to redirectUrl to pay. */
	CheckoutSession createCheckout(Booking booking);

	/** Has the student paid for this session? (asked when they come back, in case the webhook is late) */
	boolean isPaid(String sessionId);

	/** The hold ran out or was cancelled: close the payment page so nobody can pay any more. Best effort. */
	void expireSession(String sessionId);

	/** Gives the money back (cancelled booking, or a payment that arrived after the seat was gone). */
	void refund(String sessionId);

	record CheckoutSession(String sessionId, String redirectUrl) {
	}

}
