package com.eventhub.payment;

/** STRIPE = real Stripe test mode; FAKE = the built-in dev test page (no Stripe keys needed). */
public enum PaymentProvider {
	STRIPE, FAKE
}
