package org.hilal.studentmanagement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "students",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_student_ed_number",
                        columnNames = "ed_number"
                )
        }
)
public class Student {

    @Id
    @Column(
            name = "id",
            nullable = false,
            updatable = false,
            length = 36
    )
    private String id;

    @Column(
            name = "name",
            nullable = false,
            length = 60
    )
    private String name;

    @Column(
            name = "ed_number",
            length = 30
    )
    private String edNumber;

    @Column(
            name = "overall_point_base",
            nullable = false
    )
    private Long overallPointBase = 0L;

    @Column(
            name = "last_activity_at"
    )
    private Instant lastActivityAt;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private Instant createdAt;

    @Column(
            name = "updated_at",
            nullable = false
    )
    private Instant updatedAt;

    public Student() {
    }

    public Student(String name, String edNumber) {
        this.name = name;
        this.edNumber = edNumber;
    }

    @PrePersist
    public void beforeInsert() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }

        if (overallPointBase == null) {
            overallPointBase = 0L;
        }

        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void beforeUpdate() {
        updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEdNumber() {
        return edNumber;
    }

    public void setEdNumber(String edNumber) {
        this.edNumber = edNumber;
    }

    public Long getOverallPointBase() {
        return overallPointBase;
    }

    public void setOverallPointBase(Long overallPointBase) {
        this.overallPointBase = overallPointBase;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public void setLastActivityAt(Instant lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}