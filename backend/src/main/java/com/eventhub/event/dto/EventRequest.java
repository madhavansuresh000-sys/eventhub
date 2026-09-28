package com.eventhub.event.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * What an organizer sends to create or update an event.
 * The rules below are checked automatically with @Valid (Step 9).
 */
public record EventRequest(
		@NotNull(message = "clubId is required")
		Long clubId,

		@NotBlank(message = "title is required")
		@Size(max = 150, message = "title must be at most 150 characters")
		String title,

		@Size(max = 5000, message = "description must be at most 5000 characters")
		String description,

		@NotBlank(message = "venue is required")
		@Size(max = 150, message = "venue must be at most 150 characters")
		String venue,

		@NotNull(message = "startTime is required")
		@Future(message = "startTime must be in the future")
		LocalDateTime startTime,

		@NotNull(message = "endTime is required")
		LocalDateTime endTime,

		@NotNull(message = "totalSeats is required")
		@Min(value = 1, message = "totalSeats must be at least 1")
		@Max(value = 10000, message = "totalSeats must be at most 10000")
		Integer totalSeats,

		@NotNull(message = "price is required")
		@DecimalMin(value = "0.00", message = "price cannot be negative")
		BigDecimal price,

		@Size(max = 5, message = "at most 5 tags")
		List<String> tags) {
}
