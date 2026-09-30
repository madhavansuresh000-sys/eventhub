# 4. System architecture

## 4.1 The three tiers

EventHub follows the classic **three-tier architecture**:

1. **Presentation tier** - the React app in the browser. It only shows data and sends the user's actions to the server. It never decides important things (such as "is there a seat left?") on its own.
2. **Application tier** - the Spring Boot API. It owns every business rule, checks security, and talks to the database, the mail server and Stripe.
3. **Data tier** - MySQL. It stores everything and protects the data with keys and constraints.

![EventHub architecture: browser, Spring Boot layers, MySQL and outside services](architecture.png)

>> A restaurant: the waiter (React) takes your order and brings the food, but never cooks. The kitchen (Spring Boot) cooks by the recipes (business rules) and checks your table number (security). The store room (MySQL) keeps the ingredients safe and counted.

## 4.2 Layers inside the backend

The backend itself has four layers. Each layer only talks to the layer directly below it.

| Layer | Job | Example class |
|---|---|---|
| Security filters | Who is calling? Are they allowed to call this URL? | `JwtCookieFilter`, `SecurityConfig` |
| Controller | Receive the HTTP request, validate the input, return JSON | `BookingController` |
| Service | Apply the business rules inside a transaction | `BookingService` |
| Repository | Read and write the database | `BookingRepository` |

Why layers? Each piece can be understood and tested on its own. A rule such as "seats cannot go below zero" lives in exactly one place (the service), no matter whether the request came from the website, Postman or a test.

## 4.3 The journey of one request

The diagram below follows one real request from the moment Ravi presses "Book now" until the checkout page appears.

![One request from the React page to MySQL and back](request-flow.png)

This is the controller method that receives it. Notice how small it is: the controller only translates HTTP into a service call.

@code backend/src/main/java/com/eventhub/booking/BookingController.java :: public ResponseEntity<BookingResponse> hold

## 4.4 Package structure (backend)

The backend code is organised **by feature**, not by technical type. Everything about bookings is in `com.eventhub.booking`: the entity, the repository, the service, the controller and the DTOs (data transfer objects, the shapes of the JSON).

| Package | What it contains |
|---|---|
| `analytics` | Dashboard numbers (JPQL GROUP BY queries) and the 60-second cache |
| `audit` | The audit log: who did what to which event |
| `auth` | Registration, login, JWT, cookies, CSRF, club permissions, login lock, demo accounts |
| `booking` | Bookings, seat holds, confirmation, cancellation, expiry job, retry helper |
| `certificate` | Certificate numbers, PDF drawing, public verification |
| `club` | Clubs and club members (with their club role) |
| `common` | Shared exceptions and the global error handler; page responses |
| `config` | Security, CORS, cache and OpenAPI configuration |
| `event` | Events, search specifications, the status state machine, organizer and admin screens |
| `feedback` | Ratings and anonymous comments |
| `gate` | QR images, check-in and the live counter |
| `health` | `/api/health` |
| `notification` | In-app notifications, emails (after commit, with retry) and reminders |
| `payment` | The payment gateway interface, Stripe and the fake gateway, webhooks |
| `tag` | Event tags |
| `user` | Users, roles, profiles |
| `waitlist` | Waitlist entries and seat offers |

## 4.5 Folder structure of the repository

```
eventhub/
├── backend/                     Spring Boot application (Maven)
│   ├── pom.xml                  dependencies and build plugins (JaCoCo, surefire)
│   ├── mvnw, mvnw.cmd           Maven wrapper: no Maven installation needed
│   └── src/
│       ├── main/java/com/eventhub/<feature>/   code, one package per feature
│       ├── main/resources/application.yml      settings (dev and prod profiles)
│       ├── main/resources/db/migration/        Flyway SQL files V1..V9
│       └── test/java/com/eventhub/             133 tests
├── frontend/                    React application (Vite)
│   ├── package.json             dependencies and scripts (dev, build, lint, test)
│   ├── vite.config.js           dev server, /api proxy, test settings
│   └── src/
│       ├── api/                 one file per backend area (axios calls)
│       ├── components/          reusable pieces: ui, layout, events, scanner ...
│       ├── pages/               one file per screen (+ organizer/, admin/)
│       ├── store/               Redux slices
│       ├── hooks/               useAsync, useForm, useCountdown, useTheme
│       └── utils/               formatting and validation helpers
├── docker-compose.yml           MySQL 8.4 + Mailpit
├── .env.example                 template for your secrets (.env is never committed)
├── postman/                     Postman collection (25 requests, 43 checks)
├── tools/                       Edge demo tour scripts
├── docs/sketches/               the original page sketches
├── Showcase/                    presentation, this guide, screenshots
└── .github/workflows/ci.yml     GitHub Actions: tests on every push
```

## 4.6 Important design decisions

| Decision | Why | Alternative considered |
|---|---|---|
| JWT in an **httpOnly cookie** (not localStorage) | JavaScript cannot read it, so an injected script cannot steal the login | Bearer token in localStorage (easier, but stealable) |
| **Optimistic locking** (@Version) for seats | No waiting locks, safe under heavy load, simple retry | Pessimistic `SELECT ... FOR UPDATE` (locks rows, slower) |
| One seat counter: `events.available_seats` | A single number is easy to keep correct; holds already take seats | Counting bookings on every request (slow, race-prone) |
| **Server** decides time (hold timers, secondsLeft) | A phone clock can be wrong or changed | Timer only in the browser |
| Payment behind an interface (`PaymentGateway`) | The same booking code works with Stripe and with the test page | Stripe calls inside BookingService |
| Emails sent **after commit** | Never email about a change that was rolled back | Sending inside the transaction |
| Club roles read from the database on every request | Removing an organizer works immediately | Club roles inside the JWT (valid until it expires) |
| Flyway migrations + `ddl-auto: validate` | Every database is identical; mistakes are caught at start-up | Hibernate creating tables itself |
| Package by feature | Everything for one feature is together | Package by layer (controllers/, services/ ...) |

# 5. Setup and installation

This chapter takes you from an empty laptop to a running EventHub. The commands are for Windows (Command Prompt or Git Bash); on macOS or Linux use `./mvnw` instead of `mvnw` and `cp` instead of `copy`.

## 5.1 What you need to install

| Tool | Version | Why | Check with |
|---|---|---|---|
| Git | any recent | download the code | `git --version` |
| Java JDK | 25 (Temurin recommended) | run the backend | `java -version` |
| Node.js | 24 LTS | run the frontend | `node -v` |
| Docker Desktop | recent | MySQL and Mailpit in containers; also needed by the tests | `docker --version` |
| IntelliJ IDEA (optional) | Community or Ultimate | edit and run the backend | - |
| VS Code (optional) | any | edit the frontend | - |
| Postman (optional) | any | try the API by hand | - |

> Maven does **not** need to be installed: the project contains the Maven wrapper (`mvnw`), which downloads the right Maven version the first time.

## 5.2 Step 1 - get the code

```
git clone https://github.com/madhavansuresh000-sys/eventhub.git
cd eventhub
```

## 5.3 Step 2 - create your .env file

Secrets (database passwords, the JWT key, the demo password, Stripe keys) are **never** stored in the code. They live in a file called `.env` in the project folder, which is listed in `.gitignore` so it can never be pushed to GitHub. A template is provided:

@lines .env.example :: 1 :: 18

```
copy .env.example .env
```

Now open `.env` and replace every `change-me` with your own values:

1. `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` - any passwords you like.
2. `JWT_SECRET` - at least 32 random characters. Generate one with `python -c "import secrets; print(secrets.token_hex(32))"`.
3. `DEMO_PASSWORD` - the password of the five demo accounts (leave empty to create no demo accounts).
4. `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` - leave empty. EventHub then uses its built-in test payment page.

>> The `.env` file is like the key of your house: you make copies for your own family (your laptop), but you never pin it on the notice board (GitHub). The `.env.example` file is the empty key shape that shows everyone what kind of key is needed.

## 5.4 Step 3 - start MySQL and Mailpit

Start Docker Desktop and wait until it says "Engine running". Then:

```
docker compose up -d
docker compose ps
```

You should see two containers, `eventhub-mysql` (healthy) and `eventhub-mailpit`. The file that describes them:

@lines docker-compose.yml :: 1 :: 34

- MySQL listens on `localhost:3306`. Its data is kept in the Docker volume `mysql-data`, so it survives restarts.
- Mailpit shows every email EventHub sends at http://localhost:8025.

## 5.5 Step 4 - start the backend

Option A, IntelliJ: open the `backend` folder, wait until Maven has downloaded the dependencies, then run the class `EventhubApplication` (green triangle).

Option B, command line:

```
cd backend
mvnw spring-boot:run
```

What happens on start-up:

1. Spring Boot reads `application.yml`. The default profile is `dev`, which also imports `../.env`.
2. Flyway creates or updates the tables (V1 to V9). The first run also inserts sample data (V2: 5 clubs, 10 tags, 20 events).
3. Hibernate checks that the Java entities match the tables (`ddl-auto: validate`).
4. `DevDataSeeder` creates the five demo accounts if they do not exist yet.
5. The server listens on port 8080.

Check it: open http://localhost:8080/api/health - it answers `{"app":"eventhub","status":"UP"}`.

The settings file, with a comment on every line:

@lines backend/src/main/resources/application.yml :: 1 :: 70

## 5.6 Step 5 - start the frontend

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The footer shows "Backend: UP" when the React app can reach Spring Boot. Log in with one of the demo accounts from section 1.7.

## 5.7 Step 6 - run the tests

Docker Desktop must be running, because the backend tests start their own MySQL container.

```
cd backend
mvnw test
```

After about two minutes Maven prints `Tests run: 133, Failures: 0, Errors: 0`. The coverage report is written to `backend/target/site/jacoco/index.html`.

```
cd frontend
npm run lint
npm test
```

`npm test` prints `Tests 13 passed`.

> Stop the running backend before `mvnw test` on Windows: both use the `backend/target` folder, and Windows may lock files that are in use.

## 5.8 Step 7 - try the API with Postman

1. Open Postman → Import → choose `postman/EventHub.postman_collection.json`.
2. Start the backend.
3. Click the collection → Run. The 25 requests run in order and 43 checks turn green.

Or from the command line, without installing Postman:

```
npx -y newman@6 run postman/EventHub.postman_collection.json
```

## 5.9 Useful addresses (development)

| Address | What |
|---|---|
| http://localhost:5173 | The React app |
| http://localhost:8080/api/health | Backend health check (public) |
| http://localhost:8080/swagger-ui.html | API documentation (admin only: log in as the admin in the React app first) |
| http://localhost:8080/actuator/health | Health with details for the admin |
| http://localhost:8025 | Mailpit inbox: every email EventHub sent |
| localhost:3306 | MySQL (database `eventhub`) |

## 5.10 Stopping everything

```
Ctrl + C in the backend and frontend windows
docker compose down          (stops the containers, keeps the data)
docker compose down -v       (also deletes the database data - be careful)
```

## 5.11 The demo tour

`tools/edge-tour.mjs` opens a separate Microsoft Edge window and walks through the whole application in 28 steps, with a yellow explanation box at each step: visitor, booking and payment, QR ticket, certificates, gate scanning, public verification, organizer, admin approval, analytics and security. It also saves a screenshot of each step. Run it with the backend and frontend running:

```
node tools/edge-tour.mjs tour-shots
```

Every run creates one new event ("Kotlin for Beginners HH:MM") and one new booking for Ravi in the development database.
