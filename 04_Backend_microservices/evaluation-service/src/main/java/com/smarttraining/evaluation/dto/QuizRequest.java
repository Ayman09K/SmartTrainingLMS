package com.smarttraining.evaluation.dto;

import com.smarttraining.evaluation.enums.CorrectAnswerPolicy;
import com.smarttraining.evaluation.enums.QuizStatus;
import com.smarttraining.evaluation.enums.ResultPolicy;
import jakarta.validation.constraints.*;

public class QuizRequest {
    @NotNull @Positive private Long trainingId;
    @Positive private Long moduleId;
    @NotBlank private String title;
    @Size(max = 1000) private String description;
    @NotNull @Min(0) @Max(100) private Integer passingScore;
    @NotNull @Min(1) private Integer maxAttempts;
    @Min(0) private Integer timeLimitMinutes;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private ResultPolicy resultPolicy;
    private CorrectAnswerPolicy correctAnswerPolicy;
    @Size(max = 2000) private String successFeedback;
    @Size(max = 2000) private String failureFeedback;
    private QuizStatus status;

    public QuizRequest() {}

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
}
