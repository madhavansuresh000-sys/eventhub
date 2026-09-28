# Tools

## edge-demo.mjs - watch EventHub book a ticket by itself in Microsoft Edge

Opens a NEW Edge window with its own empty profile (none of your logins or history) and drives it
through Edge's DevTools connection, with a yellow caption for every step:
visitor -> login as Ravi -> book 2 Tech Fest seats -> server hold + timer -> test payment -> QR ticket
-> free event -> My tickets. Screenshots of every step are saved in the folder you give.

Needs: backend (8080) and frontend (5173) running, demo accounts (DEMO_PASSWORD in .env).
Ravi can hold only one active booking per event: cancel his Tech Fest / Intro to Git bookings
in My tickets before running it again.

```
node tools/edge-demo.mjs demo-shots
```

## edge-tour.mjs - guided tour of the WHOLE project, with an explanation on screen for every step

20 steps: visitor + server-side filters -> login as Ravi (JWT cookie) -> book Robo Race (seat hold,
optimistic locking) -> test payment (idempotent confirm) -> QR ticket -> My tickets -> Madhavan creates
and submits an event -> admin approves it -> Activity log -> Kavya is blocked from the admin area.
Each run creates a new "Kotlin for Beginners HH:MM" event. Ravi must not already have a Robo Race booking
(cancel it in My tickets before running again).

```
node tools/edge-tour.mjs tour-shots
```
