package com.smarttraining.training.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "scorm_runtime_values",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_scorm_value_attempt_key",
        columnNames = {"attempt_id", "element_key"}
    )
)
public class ScormRuntimeValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;

    @Column(name = "element_key", nullable = false, length = 255)
    private String elementKey;

    @Lob
    @Column(name = "element_value", columnDefinition = "LONGTEXT")
    private String elementValue;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public ScormRuntimeValue() {}

    public Long getId() { return id; }
    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }
    public String getElementKey() { return elementKey; }
    public void setElementKey(String elementKey) { this.elementKey = elementKey; }
    public String getElementValue() { return elementValue; }
    public void setElementValue(String elementValue) { this.elementValue = elementValue; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}