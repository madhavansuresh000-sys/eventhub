package com.eventhub.booking.dto;

import com.eventhub.payment.PaymentProvider;

/** Where to send the student to pay: Stripe's page, or our dev test page. */
public record CheckoutResponse(PaymentProvider provider, String sessionId, String redirectUrl) {
}
