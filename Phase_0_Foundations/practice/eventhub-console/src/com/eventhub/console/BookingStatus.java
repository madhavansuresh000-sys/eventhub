package com.eventhub.console;

/**
 * An enum is a fixed list of allowed values.
 * A booking can only ever be one of these two - no typos like "confrimed" are possible.
 */
public enum BookingStatus {
    CONFIRMED,
    CANCELLED
}
