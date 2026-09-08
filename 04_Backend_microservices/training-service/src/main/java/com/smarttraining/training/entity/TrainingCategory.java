package com.smarttraining.training.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "training_categories",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_training_categories_name",
                columnNames = {"name"}
        )
)
public class TrainingCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private Boolean active = Boolean.TRUE;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public TrainingCategory() {
    }

    public TrainingCategory(String name, Boolean active, Integer sortOrder) {
        this.name = normalizeName(name);
        this.active = active == null ? Boolean.TRUE : active;
        this.sortOrder = sortOrder == null ? 0 : sortOrder;
    }

    @PrePersist
    public void beforeCreate() {
        name = normalizeName(name);

        if (active == null) {
            active = Boolean.TRUE;
        }

        if (sortOrder == null) {
            sortOrder = 0;
        }

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        name = normalizeName(name);
        updatedAt = LocalDateTime.now();

        if (active == null) {
            active = Boolean.TRUE;
        }

        if (sortOrder == null) {
            sortOrder = 0;
        }
    }

    private static String normalizeName(String value) {
        return value == null
                ? null
                : value.trim().replaceAll("\\s+", " ");
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = normalizeName(name); }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}