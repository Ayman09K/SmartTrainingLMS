package com.smarttraining.training.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "scorm_objectives",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_scorm_objective_index",
        columnNames = {"attempt_id", "objective_index"}
    )
)
public class ScormObjective {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;

    @Column(name = "objective_index", nullable = false)
    private Integer objectiveIndex;

    @Column(name = "objective_id", length = 500)
    private String objectiveId;

    @Column(name = "score_raw")
    private Double scoreRaw;

    @Column(name = "score_min")
    private Double scoreMin;

    @Column(name = "score_max")
    private Double scoreMax;

    @Column(name = "score_scaled")
    private Double scoreScaled;

    @Column(name = "status_value", length = 80)
    private String statusValue;

    @Column(name = "completion_status", length = 80)
    private String completionStatus;

    @Column(name = "success_status", length = 80)
    private String successStatus;

    @Column(name = "progress_measure")
    private Double progressMeasure;

    public ScormObjective() {}

    public Long getId() { return id; }
    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }
    public Integer getObjectiveIndex() { return objectiveIndex; }
    public void setObjectiveIndex(Integer objectiveIndex) { this.objectiveIndex = objectiveIndex; }
    public String getObjectiveId() { return objectiveId; }
    public void setObjectiveId(String objectiveId) { this.objectiveId = objectiveId; }
    public Double getScoreRaw() { return scoreRaw; }
    public void setScoreRaw(Double scoreRaw) { this.scoreRaw = scoreRaw; }
    public Double getScoreMin() { return scoreMin; }
    public void setScoreMin(Double scoreMin) { this.scoreMin = scoreMin; }
    public Double getScoreMax() { return scoreMax; }
    public void setScoreMax(Double scoreMax) { this.scoreMax = scoreMax; }
    public Double getScoreScaled() { return scoreScaled; }
    public void setScoreScaled(Double scoreScaled) { this.scoreScaled = scoreScaled; }
    public String getStatusValue() { return statusValue; }
    public void setStatusValue(String statusValue) { this.statusValue = statusValue; }
    public String getCompletionStatus() { return completionStatus; }
    public void setCompletionStatus(String completionStatus) { this.completionStatus = completionStatus; }
    public String getSuccessStatus() { return successStatus; }
    public void setSuccessStatus(String successStatus) { this.successStatus = successStatus; }
    public Double getProgressMeasure() { return progressMeasure; }
    public void setProgressMeasure(Double progressMeasure) { this.progressMeasure = progressMeasure; }
}