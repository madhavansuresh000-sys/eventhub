package com.eventhub.payment;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.eventhub.booking.Booking;
import com.stripe.exception.StripeException;
import com.stripe.model.Refund;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;

/**
 * Real Stripe Checkout (use TEST keys: sk_test_..., so no real money moves).
 * The student pays on Stripe's own page; card numbers never touch our server.
 */
public class StripePaymentGateway implements PaymentGateway {

	private static final Logger log = LoggerFactory.getLogger(StripePaymentGateway.class);

	/** Stripe does not allow a checkout page to close sooner than 30 minutes; our job closes it at 10. */
	private static final long SESSION_MINUTES = 31;

	private final RequestOptions options;

	private final String frontendUrl;

	public StripePaymentGateway(String secretKey, String frontendUrl) {
		this.options = RequestOptions.builder().setApiKey(secretKey).build();
		this.frontendUrl = frontendUrl;
	}

	@Override
	public PaymentProvider provider() {
		return PaymentProvider.STRIPE;
	}

	@Override
	public CheckoutSession createCheckout(Booking booking) {
		// Stripe counts money in the smallest unit: ₹100.00 = 10000 paise
		long unitPaise = booking.getEvent().getPrice().multiply(BigDecimal.valueOf(100)).longValueExact();
		SessionCreateParams params = SessionCreateParams.builder()
			.setMode(SessionCreateParams.Mode.PAYMENT)
			.setClientReferenceId(String.valueOf(booking.getId()))
			.putMetadata("booking_id", String.valueOf(booking.getId()))
			.setCustomerEmail(booking.getUser().getEmail())
			.setExpiresAt(Instant.now().plus(SESSION_MINUTES, ChronoUnit.MINUTES).getEpochSecond())
			.setSuccessUrl(frontendUrl + "/payment/success?booking=" + booking.getId() + "&session={CHECKOUT_SESSION_ID}")
			.setCancelUrl(frontendUrl + "/payment/cancelled?booking=" + booking.getId())
			.addLineItem(SessionCreateParams.LineItem.builder()
				.setQuantity((long) booking.getQuantity())
				.setPriceData(SessionCreateParams.LineItem.PriceData.builder()
					.setCurrency("inr")
					.setUnitAmount(unitPaise)
					.setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
						.setName(booking.getEvent().getTitle())
						.build())
					.build())
				.build())
			.build();
		try {
			Session session = Session.create(params, options);
			return new CheckoutSession(session.getId(), session.getUrl());
		}
		catch (StripeException ex) {
			throw new PaymentProviderException("Could not start the payment. Please try again.", ex);
		}
	}

	@Override
	public boolean isPaid(String sessionId) {
		try {
			return "paid".equals(Session.retrieve(sessionId, options).getPaymentStatus());
		}
		catch (StripeException ex) {
			throw new PaymentProviderException("Could not check the payment with Stripe. Please try again.", ex);
		}
	}

	@Override
	public void expireSession(String sessionId) {
		try {
			Session.retrieve(sessionId, options).expire(options);
		}
		catch (StripeException ex) {
			// e.g. already paid or already expired: nothing to close
			log.info("Stripe session {} not expired: {}", sessionId, ex.getMessage());
		}
	}

	@Override
	public void refund(String sessionId) {
		try {
			String paymentIntent = Session.retrieve(sessionId, options).getPaymentIntent();
			Refund.create(RefundCreateParams.builder().setPaymentIntent(paymentIntent).build(),
					RequestOptions.builder().setApiKey(options.getApiKey()).setIdempotencyKey("refund-" + sessionId).build());
		}
		catch (StripeException ex) {
			throw new PaymentProviderException("Could not refund the payment. Please contact the admin.", ex);
		}
	}

}
