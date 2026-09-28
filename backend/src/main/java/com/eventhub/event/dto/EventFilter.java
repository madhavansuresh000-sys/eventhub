package com.eventhub.event.dto;

import java.time.LocalDate;

/**
 * Search options for the event list. Every field is optional.
 *
 * @param q    text to find in the title or description
 * @param tag  tag name, e.g. "tech"
 * @param club club slug, e.g. "coding-club"
 * @param from first day (inclusive)
 * @param to   last day (inclusive)
 */
public record EventFilter(String q, String tag, String club, LocalDate from, LocalDate to) {
}
