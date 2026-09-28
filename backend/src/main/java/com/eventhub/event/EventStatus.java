package com.eventhub.event;

import java.util.Set;

/**
 * Approval workflow (a small "state machine"):
 *
 * <pre>
 *   DRAFT --submit--> PENDING_APPROVAL --approve--> PUBLISHED
 *     ^                      |
 *     +------reject----------+   (with a reason)
 * </pre>
 */
public enum EventStatus {

	DRAFT, PENDING_APPROVAL, PUBLISHED;

	/** The only moves allowed from this status. */
	public Set<EventStatus> nextAllowed() {
		return switch (this) {
			case DRAFT -> Set.of(PENDING_APPROVAL);
			case PENDING_APPROVAL -> Set.of(PUBLISHED, DRAFT);
			case PUBLISHED -> Set.of();
		};
	}

	public boolean canMoveTo(EventStatus target) {
		return nextAllowed().contains(target);
	}

}
