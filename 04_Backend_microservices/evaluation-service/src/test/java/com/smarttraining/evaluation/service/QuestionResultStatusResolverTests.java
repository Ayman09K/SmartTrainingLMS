package com.smarttraining.evaluation.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.smarttraining.evaluation.enums.QuestionResultStatus;
import org.junit.jupiter.api.Test;

class QuestionResultStatusResolverTests {

    @Test
    void resolvesCorrectPartialAndIncorrectWithoutInventingNegativeScores() {
        assertEquals(
                QuestionResultStatus.CORRECT,
                QuestionResultStatusResolver.resolve(
                        true,
                        10,
                        10
                )
        );

        assertEquals(
                QuestionResultStatus.PARTIAL,
                QuestionResultStatusResolver.resolve(
                        false,
                        5,
                        10
                )
        );

        assertEquals(
                QuestionResultStatus.INCORRECT,
                QuestionResultStatusResolver.resolve(
                        false,
                        0,
                        10
                )
        );

        assertEquals(
                QuestionResultStatus.INCORRECT,
                QuestionResultStatusResolver.resolve(
                        false,
                        -5,
                        10
                )
        );
    }
}
