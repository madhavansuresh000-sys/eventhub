package com.eventhub.gate.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** What the scanner read from the QR code (or what the volunteer typed). */
public record CheckInRequest(@NotBlank @Size(max = 60) String code) {
}
