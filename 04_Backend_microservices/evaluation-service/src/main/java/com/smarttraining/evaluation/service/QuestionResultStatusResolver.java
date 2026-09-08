package com.smarttraining.evaluation.service;

import com.smarttraining.evaluation.enums.QuestionResultStatus;

public final class QuestionResultStatusResolver {

    private QuestionResultStatusResolver() {}

    public static QuestionResultStatus resolve(
            Boolean fullyCorrect,
            Integer pointsEarned,
            Integer maxPoints
    ) {
        if (Boolean.TRUE.equals(fullyCorrect)) {
            return QuestionResultStatus.CORRECT;
        }

        int earned = pointsEarned == null
                ? 0
                : Math.max(0, pointsEarned);
        int maximum = maxPoints == null
                ? 0
                : Math.max(0, maxPoints);

        if (
                earned > 0
                && maximum > 0
                && earned < maximum
        ) {
            return QuestionResultStatus.PARTIAL;
        }

        return QuestionResultStatus.INCORRECT;
    }
}
