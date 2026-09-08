package com.smarttraining.evaluation.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.smarttraining.evaluation.dto.QuizResponse;
import com.smarttraining.evaluation.entity.Quiz;
import com.smarttraining.evaluation.enums.AttemptStatus;
import com.smarttraining.evaluation.enums.CorrectAnswerPolicy;
import org.junit.jupiter.api.Test;

class QuizResultPolicyServiceTests {

    private final QuizResultPolicyService service =
            new QuizResultPolicyService();

    @Test
    void neverRevealsBeforeSubmission() {
        Quiz quiz = quiz(CorrectAnswerPolicy.AFTER_SUBMIT, 2);

        assertFalse(
                service.canRevealCorrectAnswer(
                        new QuizResponse(quiz),
                        AttemptStatus.STARTED,
                        0
                )
        );
    }

    @Test
    void afterSubmitRevealsOnlySubmittedResult() {
        Quiz quiz = quiz(CorrectAnswerPolicy.AFTER_SUBMIT, 2);

        assertTrue(
                service.canRevealCorrectAnswer(
                        new QuizResponse(quiz),
                        AttemptStatus.SUBMITTED,
                        1
                )
        );
    }

    @Test
    void afterLastAttemptDoesNotRevealBetweenAttempts() {
        Quiz quiz = quiz(CorrectAnswerPolicy.AFTER_LAST_ATTEMPT, 2);

        assertFalse(
                service.canRevealCorrectAnswer(
                        new QuizResponse(quiz),
                        AttemptStatus.SUBMITTED,
                        1
                )
        );

        assertTrue(
                service.canRevealCorrectAnswer(
                        new QuizResponse(quiz),
                        AttemptStatus.SUBMITTED,
                        2
                )
        );
    }

    @Test
    void neverPolicyNeverReveals() {
        Quiz quiz = quiz(CorrectAnswerPolicy.NEVER, 1);

        assertFalse(
                service.canRevealCorrectAnswer(
                        new QuizResponse(quiz),
                        AttemptStatus.SUBMITTED,
                        1
                )
        );
    }

    private Quiz quiz(
            CorrectAnswerPolicy policy,
            int maxAttempts
    ) {
        Quiz quiz = new Quiz();
        quiz.setCorrectAnswerPolicy(policy);
        quiz.setMaxAttempts(maxAttempts);
        return quiz;
    }
}
