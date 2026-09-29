package com.eventhub.event;

/** Published when an admin approves an event or sends it back. Listeners: notifications. */
public record EventReviewed(Long eventId, boolean approved, String reason) {
}
