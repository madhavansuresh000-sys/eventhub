package com.eventhub.console;

/**
 * A student who can book events.
 * All fields are final: once a Student object is created, it never changes.
 */
public class Student {

    private final int id;
    private final String name;
    private final String department;

    public Student(int id, String name, String department) {
        this.id = id;
        this.name = name;
        this.department = department;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDepartment() {
        return department;
    }

    @Override
    public String toString() {
        return name + " (" + department + ")";
    }
}
