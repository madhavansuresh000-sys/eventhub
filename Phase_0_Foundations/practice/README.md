# Phase 0 – Foundations practice

The EventHub rules in their simplest form, before Spring Boot and React.

| Folder | What | Skills |
|---|---|---|
| `eventhub-console/` | Java console app: list, book, cancel, waitlist | OOP, collections, exceptions, enums |
| `event-list-js/` | One HTML page: events from a JSON array + search box + tag filter | JavaScript arrays, DOM, events |
| `sql/` | 10 practice queries on small tables | SELECT, WHERE, JOIN, LEFT JOIN, GROUP BY, HAVING |

## 1. Java console app

**IntelliJ:** File → Open → `eventhub-console` → open `Main.java` → click the green ▶ next to `main`.
Run `Checks.java` the same way: all 13 lines should say `PASS`.

**Terminal** (inside `eventhub-console`):
```
javac -d out src/com/eventhub/console/*.java
java -cp out com.eventhub.console.Main
java -cp out com.eventhub.console.Checks
```

Classes:
```
Main            menu (1-5), reads input, catches SoldOutException
BookingService  the rules: book, join waitlist, cancel (seat goes to the next in the queue)
Event           seats + its own waitlist (Queue, first in first out)
Student         who books
Booking         one seat for one student, status CONFIRMED / CANCELLED
BookingStatus   enum: CONFIRMED, CANCELLED
SoldOutException  checked exception: callers MUST handle "no seats left"
Checks          13 automatic checks (plain Java, no JUnit)
```

Try this story in the menu: book Dance Night (2 seats) for Madhavan and Priya → Arjun gets
"sold out" and joins the waitlist → cancel Madhavan's booking → the seat goes to Arjun.

## 2. JavaScript page

Double-click `event-list-js/index.html` (it opens in your browser). Type in the search box or pick a tag.

## 3. SQL practice

Runs on its own database `sql_practice` in the Docker MySQL (it never touches EventHub data).
Easiest: open **MySQL Workbench / DBeaver / IntelliJ Database** → connect to `localhost:3306`
with the user and password from `.env` → database `sql_practice` → run `sql/phase0_sql_practice.sql`.

## Git cheat sheet (step 8)

```
git status                  what changed?
git add <files>             choose what goes into the next save
git commit -m "message"     save a snapshot with a message
git push                    send the snapshots to GitHub
git log --oneline           list of saved snapshots
git diff                    exactly what changed, line by line
```

## Questions to answer in your own words (Phase 0 "done when")

1. What is the difference between a **class** and an **object**? (Hint: `Event` vs `techFest`.)
2. What is the difference between a **List** and a **Queue**, and why does the waitlist use a Queue?
3. Why is `SoldOutException` a **checked** exception, while "unknown event id" uses `IllegalArgumentException`?
4. In SQL, what is the difference between `WHERE` and `HAVING`? Between `JOIN` and `LEFT JOIN`?
