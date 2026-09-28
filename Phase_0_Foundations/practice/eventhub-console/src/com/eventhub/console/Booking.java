package com.eventhub.console;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/** One seat booked by one student for one event. */
public class Booking {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("dd MMM, hh:mm a");

    private final int id;
    private final Event event;
    private final Student student;
    private final LocalDateTime bookedAt;
    private BookingStatus status;

    public Booking(int id, Event event, Student student) {
        this.id = id;
        this.event = event;
        this.student = student;
        this.bookedAt = LocalDateTime.now();
        this.status = BookingStatus.CONFIRMED;
    }

    public int getId() {
        return id;
    }

    public Event getEvent() {
        return event;
    }

    public Student getStudent() {
        return student;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public boolean isActive() {
        return status == BookingStatus.CONFIRMED;
    }

    /** Marks the booking as cancelled. Cancelling twice is not allowed. */
    void cancel() {
        if (status == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Booking #" + id + " is already cancelled");
        }
        status = BookingStatus.CANCELLED;
    }

    @Override
    public String toString() {
        return String.format("Booking #%d  %-24s %-26s %-9s %s",
                id, event.getTitle(), student, status, bookedAt.format(TIME));
    }
}
