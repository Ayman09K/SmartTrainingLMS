package com.smarttraining.evaluation.entity;

import com.smarttraining.evaluation.enums.CorrectAnswerPolicy;
import com.smarttraining.evaluation.enums.QuizStatus;
import com.smarttraining.evaluation.enums.ResultPolicy;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quizzes")
public class Quiz {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long trainingId;
    private Long moduleId;
    @Column(nullable = false, length = 180) private String title;
    @Column(length = 1000) private String description;
    private Integer passingScore;
    private Integer maxAttempts;
    private Integer timeLimitMinutes;
    @Column(nullable = false) private Boolean shuffleQuestions = false;
    @Column(nullable = false) private Boolean shuffleOptions = false;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40) private ResultPolicy resultPolicy = ResultPolicy.AFTER_SUBMIT;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40) private CorrectAnswerPolicy correctAnswerPolicy = CorrectAnswerPolicy.NEVER;
    @Column(length = 2000) private String successFeedback;
    @Column(length = 2000) private String failureFeedback;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private QuizStatus status = QuizStatus.DRAFT;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true) private List<Question> questions = new ArrayList<>();

    public Quiz() {}

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        applyDefaults();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
        applyDefaults();
    }

    private void applyDefaults() {
        if (status == null) status = QuizStatus.DRAFT;
        if (shuffleQuestions == null) shuffleQuestions = false;
        if (shuffleOptions == null) shuffleOptions = false;
        if (resultPolicy == null) resultPolicy = ResultPolicy.AFTER_SUBMIT;
        if (correctAnswerPolicy == null) correctAnswerPolicy = CorrectAnswerPolicy.NEVER;
    }

    public Long getId() { return id; }
    public Long getTrainingId() { return trainingId; } public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public Long getModuleId() { return moduleId; } public void setModuleId(Long moduleId) { this.moduleId = moduleId; }
    public String getTitle() { return title; } public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
    public Integer getPassingScore() { return passingScore; } public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }
    public Integer getMaxAttempts() { return maxAttempts; } public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }
    public Integer getTimeLimitMinutes() { return timeLimitMinutes; } public void setTimeLimitMinutes(Integer timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; }
    public Boolean getShuffleQuestions() { return shuffleQuestions; } public void setShuffleQuestions(Boolean shuffleQuestions) { this.shuffleQuestions = shuffleQuestions; }
    public Boolean getShuffleOptions() { return shuffleOptions; } public void setShuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; }
    public ResultPolicy getResultPolicy() { return resultPolicy; } public void setResultPolicy(ResultPolicy resultPolicy) { this.resultPolicy = resultPolicy; }
    public CorrectAnswerPolicy getCorrectAnswerPolicy() { return correctAnswerPolicy; } public void setCorrectAnswerPolicy(CorrectAnswerPolicy correctAnswerPolicy) { this.correctAnswerPolicy = correctAnswerPolicy; }
    public String getSuccessFeedback() { return successFeedback; } public void setSuccessFeedback(String successFeedback) { this.successFeedback = successFeedback; }
    public String getFailureFeedback() { return failureFeedback; } public void setFailureFeedback(String failureFeedback) { this.failureFeedback = failureFeedback; }
    public QuizStatus getStatus() { return status; } public void setStatus(QuizStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; } public LocalDateTime getUpdatedAt() { return updatedAt; }
    public List<Question> getQuestions() { return questions; } public void setQuestions(List<Question> questions) { this.questions = questions; }
}
