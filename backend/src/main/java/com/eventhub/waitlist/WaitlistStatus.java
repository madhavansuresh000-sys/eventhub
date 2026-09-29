package com.eventhub.waitlist;

/**
 * WAITING ──seat frees up──▶ OFFERED ──accept──▶ BOOKED
 *    │                         ├──30 minutes──▶ EXPIRED
 *    └──leave──▶ LEFT          └──leave──▶ LEFT
 */
public enum WaitlistStatus {
	WAITING, OFFERED, BOOKED, EXPIRED, LEFT;

	/** Still in the queue (WAITING or OFFERED). */
	public boolean isOpen() {
		return this == WAITING || this == OFFERED;
	}
}
