package com.eventhub.booking;

/** Published when a booking becomes CONFIRMED (paid, or a free event). Listeners: notifications. */
public record BookingConfirmed(Long bookingId) {
}
