package com.smarttraining.evaluation.dto;

import com.smarttraining.evaluation.enums.QuestionResultStatus;
import com.smarttraining.evaluation.enums.QuestionType;

public record LearnerQuestionResultResponse(
        Long questionId,
        String prompt,
        QuestionType type,
        QuestionResultStatus status,
        Integer pointsEarned,
        Integer maxPoints,
        SubmittedAnswerRequest learnerAnswer,
        String feedback,
        String explanation,
        LearnerCorrectAnswerResponse correctAnswer
) {
}
