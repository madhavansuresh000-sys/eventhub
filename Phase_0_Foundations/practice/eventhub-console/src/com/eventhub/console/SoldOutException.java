package com.eventhub.console;

/**
 * Our own exception for "no seats left".
 *
 * It extends Exception (a "checked" exception), so Java FORCES every caller
 * to handle it with try/catch. That is exactly what we want: whoever books a seat
 * must think about the sold-out case (for example, offer the waitlist).
 */
public class SoldOutException extends Exception {

    private final Event event;

    public SoldOutException(Event event) {
        super("Sorry, " + event.getTitle() + " is sold out.");
        this.event = event;
    }

    public Event getEvent() {
        return event;
    }
}
