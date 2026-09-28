package com.eventhub.event.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Admin sends an event back to DRAFT with a reason (Step 8). */
public record ReviewRequest(
		@NotBlank(message = "reason is required")
		@Size(max = 500, message = "reason must be at most 500 characters")
		String reason) {
}
