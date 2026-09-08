package com.smarttraining.training.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "scorm_interactions",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_scorm_interaction_index",
        columnNames = {"attempt_id", "interaction_index"}
    )
)
public class ScormInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;

    @Column(name = "interaction_index", nullable = false)
    private Integer interactionIndex;

    @Column(name = "interaction_id", length = 500)
    private String interactionId;

    @Column(name = "interaction_type", length = 80)
    private String interactionType;

    @Lob
    @Column(name = "learner_response", columnDefinition = "TEXT")
    private String learnerResponse;

    @Lob
    @Column(name = "correct_response", columnDefinition = "TEXT")
    private String correctResponse;

    @Column(name = "result_value", length = 100)
    private String resultValue;

    private Double weighting;

    @Column(length = 100)
    private String latency;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String description;

    public ScormInteraction() {}

    public Long getId() { return id; }
    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }
    public Integer getInteractionIndex() { return interactionIndex; }
    public void setInteractionIndex(Integer interactionIndex) { this.interactionIndex = interactionIndex; }
    public String getInteractionId() { return interactionId; }
    public void setInteractionId(String interactionId) { this.interactionId = interactionId; }
    public String getInteractionType() { return interactionType; }
    public void setInteractionType(String interactionType) { this.interactionType = interactionType; }
    public String getLearnerResponse() { return learnerResponse; }
    public void setLearnerResponse(String learnerResponse) { this.learnerResponse = learnerResponse; }
    public String getCorrectResponse() { return correctResponse; }
    public void setCorrectResponse(String correctResponse) { this.correctResponse = correctResponse; }
    public String getResultValue() { return resultValue; }
    public void setResultValue(String resultValue) { this.resultValue = resultValue; }
    public Double getWeighting() { return weighting; }
    public void setWeighting(Double weighting) { this.weighting = weighting; }
    public String getLatency() { return latency; }
    public void setLatency(String latency) { this.latency = latency; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}