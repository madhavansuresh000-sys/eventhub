package com.eventhub.gate;

/** What the volunteer sees: green VALID (let in), red ALREADY_USED or INVALID (stop). */
public enum CheckInResult {
	VALID, ALREADY_USED, INVALID
}
