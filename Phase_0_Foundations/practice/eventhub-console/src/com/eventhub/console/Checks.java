package com.eventhub.console;

/**
 * Automatic checks for the "done when" rule of Phase 0:
 * booking, sold out, cancel and waitlist all work.
 * Run this class; every line should say PASS.
 * (Plain Java - in Phase 2 we used JUnit for the same job.)
 */
public class Checks {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) throws SoldOutException {
        BookingService s = Main.createSampleData();

        // Dance Night (id 2) has 2 seats
        Booking madhavan = s.book(2, 101);
        s.book(2, 102);
        check("two bookings fill Dance Night", s.findEvent(2).isSoldOut());

        // third student: sold out
        boolean soldOutThrown = false;
        try {
            s.book(2, 103);
        } catch (SoldOutException e) {
            soldOutThrown = true;
        }
        check("third booking throws SoldOutException", soldOutThrown);

        // waitlist is first in, first out
        check("Arjun is 1st on the waitlist", s.joinWaitlist(2, 103) == 1);
        check("Divya is 2nd on the waitlist", s.joinWaitlist(2, 104) == 2);

        // cancelling gives the seat to the first student in the queue
        Booking promoted = s.cancel(madhavan.getId());
        check("cancelled booking is CANCELLED", madhavan.getStatus() == BookingStatus.CANCELLED);
        check("the seat went to Arjun", promoted != null && promoted.getStudent().getName().equals("Arjun"));
        check("event is still full (seat moved, not freed)", s.findEvent(2).isSoldOut());
        check("Divya is now 1st in the queue", s.findEvent(2).getWaitlist().getFirst().getName().equals("Divya"));

        // cancelling with an empty queue frees the seat
        Booking hackathon = s.book(3, 101);
        s.cancel(hackathon.getId());
        check("seat is free again when nobody waits", s.findEvent(3).getAvailableSeats() == 3);

        // rules that must say no
        s.book(1, 101);
        check("cannot book the same event twice", fails(() -> s.book(1, 101)));
        check("cannot cancel twice", fails(() -> s.cancel(madhavan.getId())));
        check("cannot join waitlist when seats are free", fails(() -> s.joinWaitlist(1, 102)));
        check("unknown event is rejected", fails(() -> s.book(99, 101)));

        System.out.println();
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed > 0) {
            System.exit(1);
        }
    }

    private static void check(String name, boolean ok) {
        System.out.println((ok ? "PASS  " : "FAIL  ") + name);
        if (ok) {
            passed++;
        } else {
            failed++;
        }
    }

    /** Runs the action; returns true if it was refused with an exception. */
    private static boolean fails(Action action) {
        try {
            action.run();
            return false;
        } catch (Exception e) {
            return true;
        }
    }

    @FunctionalInterface
    private interface Action {
        void run() throws Exception;
    }
}
