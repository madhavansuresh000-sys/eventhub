package com.eventhub.booking;

/**
 * HELD ──paid / free──▶ CONFIRMED ──cancel──▶ CANCELLED
 *   │  └──cancel──▶ CANCELLED
 *   └──10 minutes, not paid──▶ EXPIRED
 */
public enum BookingStatus {
	HELD, CONFIRMED, CANCELLED, EXPIRED;

	/** Seats are taken from the event while the booking is HELD or CONFIRMED. */
	public boolean holdsSeats() {
		return this == HELD || this == CONFIRMED;
	}
}
