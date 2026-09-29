package com.eventhub.gate.dto;

/** The live counter: "32 of 40 people are in". */
public record GateStats(Long eventId, long bookedPeople, long checkedInPeople) {
}
