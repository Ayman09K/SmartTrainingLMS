package com.smarttraining.evaluation.service;

import com.smarttraining.evaluation.dto.QuizResponse;
import com.smarttraining.evaluation.enums.AttemptStatus;
import com.smarttraining.evaluation.enums.CorrectAnswerPolicy;
import org.springframework.stereotype.Component;

@Component
public class QuizResultPolicyService {

    public boolean canShowDetailedResult(AttemptStatus status) {
        return status == AttemptStatus.SUBMITTED;
    }

    public boolean canRevealCorrectAnswer(
            QuizResponse quiz,
            AttemptStatus status,
            int consumedAttempts
    ) {
        if (!canShowDetailedResult(status)) {
            return false;
        }

        CorrectAnswerPolicy policy = quiz.getCorrectAnswerPolicy();

        if (policy == null || policy == CorrectAnswerPolicy.NEVER) {
            return false;
        }

        if (policy == CorrectAnswerPolicy.AFTER_SUBMIT) {
            return true;
        }

        if (policy == CorrectAnswerPolicy.AFTER_LAST_ATTEMPT) {
            Integer maxAttempts = quiz.getMaxAttempts();

            return maxAttempts != null
                    && maxAttempts > 0
                    && consumedAttempts >= maxAttempts;
        }

        return false;
    }
}
