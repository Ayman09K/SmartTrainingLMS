package com.smarttraining.evaluation.entity;

import com.smarttraining.evaluation.enums.AttemptStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quiz_attempts")
public class QuizAttempt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long quizId;
    private Long learnerId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private AttemptStatus status = AttemptStatus.STARTED;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private Integer score;
    private Integer totalPoints;
    private Boolean success;
    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true) private List<QuestionAnswer> answers = new ArrayList<>();
    public QuizAttempt() {}
    @PrePersist public void onCreate() { startedAt = LocalDateTime.now(); if (status == null) status = AttemptStatus.STARTED; }
    public Long getId() { return id; }
    public Long getQuizId() { return quizId; } public void setQuizId(Long quizId) { this.quizId = quizId; }
    public Long getLearnerId() { return learnerId; } public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }
    public AttemptStatus getStatus() { return status; } public void setStatus(AttemptStatus status) { this.status = status; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public LocalDateTime getSubmittedAt() { return submittedAt; } public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
    public Integer getScore() { return score; } public void setScore(Integer score) { this.score = score; }
    public Integer getTotalPoints() { return totalPoints; } public void setTotalPoints(Integer totalPoints) { this.totalPoints = totalPoints; }
    public Boolean getSuccess() { return success; } public void setSuccess(Boolean success) { this.success = success; }
    public List<QuestionAnswer> getAnswers() { return answers; } public void setAnswers(List<QuestionAnswer> answers) { this.answers = answers; }
}
