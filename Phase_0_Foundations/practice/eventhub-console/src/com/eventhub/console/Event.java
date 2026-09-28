package com.eventhub.console;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

/**
 * A college event with a fixed number of seats and its own waitlist.
 *
 * The waitlist is a Queue: first in, first out (FIFO) - like a queue at a
 * ticket counter. The student who joined first gets the next free seat.
 */
public class Event {

    private final int id;
    private final String title;
    private final String venue;
    private final int totalSeats;
    private int availableSeats;                       // changes when people book or cancel
    private final Queue<Student> waitlist = new ArrayDeque<>();

    public Event(int id, String title, String venue, int totalSeats) {
        if (totalSeats < 1) {
            throw new IllegalArgumentException("An event needs at least 1 seat");
        }
        this.id = id;
        this.title = title;
        this.venue = venue;
        this.totalSeats = totalSeats;
        this.availableSeats = totalSeats;             // a new event starts with every seat free
    }

    public int getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getVenue() {
        return venue;
    }

    public int getTotalSeats() {
        return totalSeats;
    }

    public int getAvailableSeats() {
        return availableSeats;
    }

    public boolean isSoldOut() {
        return availableSeats == 0;
    }

    /** Takes one seat. Only this class can change the seat count, so it can never go below 0. */
    void takeSeat() throws SoldOutException {
        if (isSoldOut()) {
            throw new SoldOutException(this);
        }
        availableSeats--;
    }

    /** Gives one seat back (after a cancellation). */
    void freeSeat() {
        if (availableSeats == totalSeats) {
            throw new IllegalStateException("All seats of " + title + " are already free");
        }
        availableSeats++;
    }

    // ---------- waitlist (Queue) ----------

    /** Adds the student to the END of the queue. Returns their position (1 = next in line). */
    int joinWaitlist(Student student) {
        if (waitlist.contains(student)) {
            throw new IllegalStateException(student.getName() + " is already on the waitlist");
        }
        waitlist.offer(student);
        return waitlist.size();
    }

    /** Removes and returns the FIRST student in the queue, or null if the queue is empty. */
    Student nextFromWaitlist() {
        return waitlist.poll();
    }

    /** A copy of the waitlist in order, so nobody outside can change the real queue. */
    public List<Student> getWaitlist() {
        return new ArrayList<>(waitlist);
    }

    @Override
    public String toString() {
        String seats = isSoldOut() ? "SOLD OUT" : availableSeats + "/" + totalSeats + " seats left";
        return String.format("%d. %-24s %-18s %s", id, title, venue, seats);
    }
}
