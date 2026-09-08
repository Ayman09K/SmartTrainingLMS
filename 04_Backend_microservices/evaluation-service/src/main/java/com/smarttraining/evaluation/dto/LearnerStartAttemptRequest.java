package com.smarttraining.evaluation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class LearnerStartAttemptRequest {

    @NotNull
    @Positive
    private Long quizId;

    public LearnerStartAttemptRequest() {
    }

    public Long getQuizId() {
        return quizId;
    }

    public void setQuizId(Long quizId) {
        this.quizId = quizId;
    }
}
