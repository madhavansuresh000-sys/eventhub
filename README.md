# EventHub 🎟️

**BookMyShow for your college.** A full stack event ticketing platform built with **Spring Boot + React + MySQL**.

From poster to gate: **Plan → Approve → Publish → Book (10-min seat hold) → Waitlist → QR check-in → Certificate**

## Signature features
1. Booking engine that never oversells (10-minute seat hold + optimistic locking)
2. Smart waitlist that offers freed seats automatically
3. QR e-tickets scanned by volunteers at the gate
4. PDF certificates only for students who attended, with a verify link
5. Approval workflow and organizer analytics dashboard

## Tech stack
| Layer | Tools |
|---|---|
| Backend | Java, Spring Boot, Spring Data JPA, Spring Security (JWT), Flyway |
| Frontend | React (Vite), Tailwind CSS, React Router, Redux Toolkit, Axios |
| Database | MySQL 8 (runs in Docker) |
| Tools | Docker, GitHub Actions, Postman, Swagger UI |

## Folder structure
```
backend/               Spring Boot API        (localhost:8080)
frontend/              React app              (localhost:5173)
00_Project_Documents/  Guide, master plan, phase plan
Phase_0 … Phase_9/     Checklist for each phase
```

## Status
🚧 Phase 1: Creating the project
