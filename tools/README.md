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
