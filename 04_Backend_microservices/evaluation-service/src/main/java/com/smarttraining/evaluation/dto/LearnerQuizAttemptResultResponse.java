package com.smarttraining.evaluation.dto;

import com.smarttraining.evaluation.enums.AttemptStatus;
import com.smarttraining.evaluation.enums.CorrectAnswerPolicy;
import com.smarttraining.evaluation.enums.ResultPolicy;
import java.time.LocalDateTime;
import java.util.List;

public record LearnerQuizAttemptResultResponse(
        Long id,
        Long attemptId,
        Long quizId,
        Long learnerId,
        AttemptStatus status,
        LocalDateTime startedAt,
        LocalDateTime submittedAt,
        Integer score,
        Integer totalPoints,
        Boolean success,
        List<QuestionAnswerResponse> answers,
        Integer attemptNumber,
        Long durationSeconds,
        Integer earnedPoints,
        Integer maxPoints,
        Integer scorePercent,
        Boolean passed,
        Integer remainingAttempts,
        String globalFeedback,
        ResultPolicy resultPolicy,
        CorrectAnswerPolicy correctAnswerPolicy,
        List<LearnerQuestionResultResponse> questionResults
) {
}
