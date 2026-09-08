package com.smarttraining.evaluation.dto;

import com.smarttraining.evaluation.enums.CorrectAnswerPolicy;
import com.smarttraining.evaluation.enums.ResultPolicy;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Random;

public record LearnerQuizResponse(
        Long id,
        Long trainingId,
        Long moduleId,
        String title,
        String description,
        Integer passingScore,
        Integer maxAttempts,
        Integer timeLimitMinutes,
        Boolean shuffleQuestions,
        Boolean shuffleOptions,
        ResultPolicy resultPolicy,
        CorrectAnswerPolicy correctAnswerPolicy,
        List<LearnerQuestionResponse> questions
) {
    public static LearnerQuizResponse summary(QuizResponse quiz) {
        return new LearnerQuizResponse(
                quiz.getId(),
                quiz.getTrainingId(),
                quiz.getModuleId(),
                quiz.getTitle(),
                quiz.getDescription(),
                quiz.getPassingScore(),
                quiz.getMaxAttempts(),
                quiz.getTimeLimitMinutes(),
                quiz.getShuffleQuestions(),
                quiz.getShuffleOptions(),
                quiz.getResultPolicy(),
                quiz.getCorrectAnswerPolicy(),
                List.of()
        );
    }

    public static LearnerQuizResponse full(
            QuizFullResponse quiz,
            Long learnerId
    ) {
        List<LearnerQuestionResponse> mapped =
                quiz.getQuestions() == null
                        ? new ArrayList<>()
                        : new ArrayList<>(
                                quiz.getQuestions()
                                        .stream()
                                        .map(LearnerQuestionResponse::from)
                                        .toList()
                        );

        for (int index = 0; index < mapped.size(); index++) {
            LearnerQuestionResponse question = mapped.get(index);
            mapped.set(
                    index,
                    question.forPresentation(
                            Boolean.TRUE.equals(
                                    quiz.getShuffleOptions()
                            ),
                            seed(
                                    quiz.getId(),
                                    learnerId,
                                    question.id(),
                                    2003L
                            )
                    )
            );
        }

        if (
                Boolean.TRUE.equals(quiz.getShuffleQuestions())
                && mapped.size() > 1
        ) {
            Collections.shuffle(
                    mapped,
                    new Random(
                            seed(
                                    quiz.getId(),
                                    learnerId,
                                    0L,
                                    1009L
                            )
                    )
            );
        }

        return new LearnerQuizResponse(
                quiz.getId(),
                quiz.getTrainingId(),
                quiz.getModuleId(),
                quiz.getTitle(),
                quiz.getDescription(),
                quiz.getPassingScore(),
                quiz.getMaxAttempts(),
                quiz.getTimeLimitMinutes(),
                quiz.getShuffleQuestions(),
                quiz.getShuffleOptions(),
                quiz.getResultPolicy(),
                quiz.getCorrectAnswerPolicy(),
                List.copyOf(mapped)
        );
    }

    public static LearnerQuizResponse full(QuizFullResponse quiz) {
        return full(quiz, 0L);
    }

    private static long seed(
            Long quizId,
            Long learnerId,
            Long questionId,
            long salt
    ) {
        return Objects.hash(
                quizId == null ? 0L : quizId,
                learnerId == null ? 0L : learnerId,
                questionId == null ? 0L : questionId,
                salt
        );
    }
}
