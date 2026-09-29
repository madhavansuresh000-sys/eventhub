package com.eventhub.gate.dto;

import java.time.LocalDateTime;

import com.eventhub.gate.CheckInResult;

/**
 * The answer for one scan. holder / quantity are filled only for a real ticket of THIS event
 * (a volunteer does not need to know who booked other events).
 */
public record CheckInResponse(
		CheckInResult result,
		String message,
		String code,
		String holder,
		Integer quantity,
		LocalDateTime checkedInAt,
		GateStats stats) {
}
