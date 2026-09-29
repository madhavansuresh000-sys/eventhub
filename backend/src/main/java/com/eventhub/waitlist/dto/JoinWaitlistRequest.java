package com.eventhub.waitlist.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record JoinWaitlistRequest(
		@NotNull Long eventId,
		@NotNull @Min(1) @Max(10) Integer quantity) {
}
