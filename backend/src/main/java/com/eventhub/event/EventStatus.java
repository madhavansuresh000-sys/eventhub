package com.eventhub.event;

/**
 * Approval workflow:
 * DRAFT -> PENDING_APPROVAL -> PUBLISHED, or back to DRAFT with a review note.
 */
public enum EventStatus {
	DRAFT, PENDING_APPROVAL, PUBLISHED
}
