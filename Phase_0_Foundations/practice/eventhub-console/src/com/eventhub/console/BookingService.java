package com.eventhub.console;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * All the EventHub rules in one place: book, cancel, waitlist.
 * Main only talks to this class - the same idea as a Spring "service" later.
 *
 * Collections used:
 *   List<Event>             events in the order they were added
 *   Map<Integer, Student>   find a student quickly by id
 *   Map<Integer, Booking>   find a booking quickly by id
 *   Queue<Student>          each event's waitlist (inside Event)
 */
public class BookingService {

    private final List<Event> events = new ArrayList<>();
    private final Map<Integer, Student> students = new LinkedHashMap<>();
    private final Map<Integer, Booking> bookings = new LinkedHashMap<>();
    private int nextBookingId = 1;

    public void addEvent(Event event) {
        events.add(event);
    }

    public void addStudent(Student student) {
        students.put(student.getId(), student);
    }

    public List<Event> getEvents() {
        return List.copyOf(events);
    }

    public List<Student> getStudents() {
        return List.copyOf(students.values());
    }

    public Event findEvent(int eventId) {
        for (Event event : events) {
            if (event.getId() == eventId) {
                return event;
            }
        }
        throw new IllegalArgumentException("No event with id " + eventId);
    }

    public Student findStudent(int studentId) {
        Student student = students.get(studentId);
        if (student == null) {
            throw new IllegalArgumentException("No student with id " + studentId);
        }
        return student;
    }

    /**
     * Books one seat. Throws SoldOutException when there are no seats,
     * so the caller can offer the waitlist.
     */
    public Booking book(int eventId, int studentId) throws SoldOutException {
        Event event = findEvent(eventId);
        Student student = findStudent(studentId);

        if (hasActiveBooking(event, student)) {
            throw new IllegalStateException(student.getName() + " already has a seat for " + event.getTitle());
        }
        event.takeSeat();                                   // may throw SoldOutException
        return createBooking(event, student);
    }

    /** Puts the student in the event's queue. Only allowed when the event is sold out. */
    public int joinWaitlist(int eventId, int studentId) {
        Event event = findEvent(eventId);
        Student student = findStudent(studentId);

        if (!event.isSoldOut()) {
            throw new IllegalStateException(event.getTitle() + " still has seats - book directly instead");
        }
        if (hasActiveBooking(event, student)) {
            throw new IllegalStateException(student.getName() + " already has a seat for " + event.getTitle());
        }
        return event.joinWaitlist(student);
    }

    /**
     * Cancels a booking. If someone is waiting, the freed seat goes straight to
     * the first student in the queue, and their new booking is returned (else null).
     */
    public Booking cancel(int bookingId) {
        Booking booking = bookings.get(bookingId);
        if (booking == null) {
            throw new IllegalArgumentException("No booking with id " + bookingId);
        }
        booking.cancel();

        Event event = booking.getEvent();
        Student next = event.nextFromWaitlist();
        if (next == null) {
            event.freeSeat();                                // nobody waiting: the seat becomes free
            return null;
        }
        return createBooking(event, next);                  // the seat moves to the next student
    }

    public List<Booking> getBookings() {
        return List.copyOf(bookings.values());
    }

    private boolean hasActiveBooking(Event event, Student student) {
        for (Booking b : bookings.values()) {
            if (b.isActive() && b.getEvent() == event && b.getStudent() == student) {
                return true;
            }
        }
        return false;
    }

    private Booking createBooking(Event event, Student student) {
        Booking booking = new Booking(nextBookingId++, event, student);
        bookings.put(booking.getId(), booking);
        return booking;
    }
}
