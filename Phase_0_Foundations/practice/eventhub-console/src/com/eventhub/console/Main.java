package com.eventhub.console;

import java.util.List;
import java.util.Scanner;

/**
 * EventHub console app: a text menu on top of BookingService.
 * Run it, then type a number and press Enter.
 */
public class Main {

    private static final Scanner in = new Scanner(System.in);

    public static void main(String[] args) {
        BookingService service = createSampleData();

        System.out.println("==============================================");
        System.out.println("   Welcome to EventHub (console edition)");
        System.out.println("==============================================");

        while (true) {
            printMenu();
            Integer choice = readNumber("Choose an option: ");
            if (choice == null || choice == 0) {
                System.out.println("Goodbye! See you at the next event.");
                return;
            }
            try {
                switch (choice) {
                    case 1 -> listEvents(service);
                    case 2 -> bookSeat(service);
                    case 3 -> cancelBooking(service);
                    case 4 -> showWaitlist(service);
                    case 5 -> showBookings(service);
                    default -> System.out.println("Please choose a number from the menu.");
                }
            } catch (IllegalArgumentException | IllegalStateException e) {
                // our own rules said "no" - show the reason and go back to the menu
                System.out.println("[!] " + e.getMessage());
            }
        }
    }

    private static void printMenu() {
        System.out.println();
        System.out.println("1. List events");
        System.out.println("2. Book a seat");
        System.out.println("3. Cancel a booking");
        System.out.println("4. Show waitlist");
        System.out.println("5. Show all bookings");
        System.out.println("0. Exit");
    }

    private static void listEvents(BookingService service) {
        System.out.println("\n--- Events ---");
        service.getEvents().forEach(System.out::println);
    }

    private static void bookSeat(BookingService service) {
        System.out.println("\n--- Students ---");
        service.getStudents().forEach(s -> System.out.println(s.getId() + ". " + s));
        Integer studentId = readNumber("Student id: ");
        listEvents(service);
        Integer eventId = readNumber("Event id: ");
        if (studentId == null || eventId == null) {
            return;
        }

        try {
            Booking booking = service.book(eventId, studentId);
            System.out.println("[OK] Booked! " + booking);
        } catch (SoldOutException e) {
            // the checked exception forces us to handle the sold-out case here
            System.out.println("[FULL] " + e.getMessage());
            String answer = readLine("Join the waitlist? (y/n): ");
            if (answer != null && answer.trim().equalsIgnoreCase("y")) {
                int position = service.joinWaitlist(eventId, studentId);
                System.out.println("[OK] You are number " + position + " on the waitlist for "
                        + e.getEvent().getTitle() + ".");
            }
        }
    }

    private static void cancelBooking(BookingService service) {
        showBookings(service);
        Integer bookingId = readNumber("Booking id to cancel: ");
        if (bookingId == null) {
            return;
        }
        Booking promoted = service.cancel(bookingId);
        System.out.println("[OK] Booking #" + bookingId + " cancelled.");
        if (promoted != null) {
            System.out.println("[WAITLIST] The seat went to " + promoted.getStudent().getName()
                    + " -> " + promoted);
        }
    }

    private static void showWaitlist(BookingService service) {
        listEvents(service);
        Integer eventId = readNumber("Event id: ");
        if (eventId == null) {
            return;
        }
        Event event = service.findEvent(eventId);
        List<Student> queue = event.getWaitlist();
        System.out.println("\n--- Waitlist for " + event.getTitle() + " ---");
        if (queue.isEmpty()) {
            System.out.println("Nobody is waiting.");
        }
        for (int i = 0; i < queue.size(); i++) {
            System.out.println((i + 1) + ". " + queue.get(i));
        }
    }

    private static void showBookings(BookingService service) {
        System.out.println("\n--- Bookings ---");
        List<Booking> bookings = service.getBookings();
        if (bookings.isEmpty()) {
            System.out.println("No bookings yet.");
        }
        bookings.forEach(System.out::println);
    }

    // ---------- reading input safely ----------

    /** Returns the typed line, or null when the input has ended. */
    private static String readLine(String prompt) {
        System.out.print(prompt);
        return in.hasNextLine() ? in.nextLine() : null;
    }

    /** Asks until a whole number is typed. Returns null when the input has ended. */
    private static Integer readNumber(String prompt) {
        while (true) {
            String line = readLine(prompt);
            if (line == null) {
                return null;
            }
            try {
                return Integer.parseInt(line.trim());
            } catch (NumberFormatException e) {
                System.out.println("Please type a number, e.g. 2");
            }
        }
    }

    // ---------- sample data ----------

    static BookingService createSampleData() {
        BookingService service = new BookingService();
        service.addEvent(new Event(1, "Tech Fest 2026", "Main Auditorium", 200));
        service.addEvent(new Event(2, "Dance Night", "Open Air Theatre", 2));   // only 2 seats: easy to sell out
        service.addEvent(new Event(3, "24-Hour Hackathon", "CSE Block Lab 1", 3));

        service.addStudent(new Student(101, "Madhavan", "CSE"));
        service.addStudent(new Student(102, "Priya", "ECE"));
        service.addStudent(new Student(103, "Arjun", "Mechanical"));
        service.addStudent(new Student(104, "Divya", "IT"));
        return service;
    }
}
