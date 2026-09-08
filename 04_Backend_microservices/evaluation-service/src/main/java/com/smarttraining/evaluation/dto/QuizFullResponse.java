package com.smarttraining.evaluation.dto;

import com.smarttraining.evaluation.entity.Quiz;
import com.smarttraining.evaluation.enums.CorrectAnswerPolicy;
import com.smarttraining.evaluation.enums.QuizStatus;
import com.smarttraining.evaluation.enums.ResultPolicy;
import java.time.LocalDateTime;
import java.util.List;

public class QuizFullResponse {
    private Long id;
    private Long trainingId;
    private Long moduleId;
    private String title;
    private String description;
    private Integer passingScore;
    private Integer maxAttempts;
    private Integer timeLimitMinutes;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private ResultPolicy resultPolicy;
    private CorrectAnswerPolicy correctAnswerPolicy;
    private String successFeedback;
    private String failureFeedback;
    private QuizStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<QuestionFullResponse> questions;

    public QuizFullResponse() {}

    public QuizFullResponse(Quiz quiz, List<QuestionFullResponse> questions) {
        id = quiz.getId();
        trainingId = quiz.getTrainingId();
        moduleId = quiz.getModuleId();
        title = quiz.getTitle();
        description = quiz.getDescription();
        passingScore = quiz.getPassingScore();
        maxAttempts = quiz.getMaxAttempts();
        timeLimitMinutes = quiz.getTimeLimitMinutes();
        shuffleQuestions = quiz.getShuffleQuestions();
        shuffleOptions = quiz.getShuffleOptions();
        resultPolicy = quiz.getResultPolicy();
        correctAnswerPolicy = quiz.getCorrectAnswerPolicy();
        successFeedback = quiz.getSuccessFeedback();
        failureFeedback = quiz.getFailureFeedback();
        status = quiz.getStatus();
        createdAt = quiz.getCreatedAt();
        updatedAt = quiz.getUpdatedAt();
        this.questions = questions;
    }

    public Long getId() { return id; }
    public Long getTrainingId() { return trainingId; }
    public Long getModuleId() { return moduleId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Integer getPassingScore() { return passingScore; }
    public Integer getMaxAttempts() { return maxAttempts; }
    public Integer getTimeLimitMinutes() { return timeLimitMinutes; }
    public Boolean getShuffleQuestions() { return shuffleQuestions; }
    public Boolean getShuffleOptions() { return shuffleOptions; }
    public ResultPolicy getResultPolicy() { return resultPolicy; }
    public CorrectAnswerPolicy getCorrectAnswerPolicy() { return correctAnswerPolicy; }
    public String getSuccessFeedback() { return successFeedback; }
    public String getFailureFeedback() { return failureFeedback; }
    public QuizStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public List<QuestionFullResponse> getQuestions() { return questions; }
}
