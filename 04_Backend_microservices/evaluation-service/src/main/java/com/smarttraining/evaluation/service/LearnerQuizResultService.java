package com.smarttraining.evaluation.service;

import com.smarttraining.evaluation.dto.LearnerAnswerOptionResponse;
import com.smarttraining.evaluation.dto.LearnerCorrectAnswerResponse;
import com.smarttraining.evaluation.dto.LearnerQuestionResultResponse;
import com.smarttraining.evaluation.dto.LearnerQuizAttemptResultResponse;
import com.smarttraining.evaluation.dto.QuestionAnswerResponse;
import com.smarttraining.evaluation.dto.QuestionFullResponse;
import com.smarttraining.evaluation.dto.QuizAttemptFullResponse;
import com.smarttraining.evaluation.dto.QuizAttemptResponse;
import com.smarttraining.evaluation.dto.QuizFullResponse;
import com.smarttraining.evaluation.dto.QuizResponse;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.enums.AttemptStatus;
import com.smarttraining.evaluation.enums.QuestionResultStatus;
import java.time.Duration;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class LearnerQuizResultService {

    private final EvaluationService evaluationService;
    private final SubmittedAnswerCodec submittedAnswerCodec;
    private final QuizResultPolicyService policyService;

    public LearnerQuizResultService(
            EvaluationService evaluationService,
            SubmittedAnswerCodec submittedAnswerCodec,
            QuizResultPolicyService policyService
    ) {
        this.evaluationService = evaluationService;
        this.submittedAnswerCodec = submittedAnswerCodec;
        this.policyService = policyService;
    }

    public LearnerQuizAttemptResultResponse build(
            QuizAttemptFullResponse attempt
    ) {
        QuizResponse quiz =
                evaluationService.getQuizById(attempt.getQuizId());

        List<QuizAttemptResponse> allAttempts =
                evaluationService.getAttemptsByLearnerAndQuiz(
                        attempt.getLearnerId(),
                        attempt.getQuizId()
                )
                .stream()
                .sorted(
                        Comparator.comparing(
                                QuizAttemptResponse::getStartedAt,
                                Comparator.nullsLast(
                                        Comparator.naturalOrder()
                                )
                        )
                )
                .toList();

        int consumedAttempts = (int) allAttempts.stream()
                .filter(this::isConsumed)
                .count();

        int attemptNumber = attemptNumber(
                allAttempts,
                attempt.getId()
        );

        int consumedThroughAttempt =
                consumedThroughAttempt(
                        allAttempts,
                        attempt.getId()
                );

        Integer remainingAttempts = remainingAttempts(
                quiz.getMaxAttempts(),
                consumedThroughAttempt
        );

        Long durationSeconds = durationSeconds(attempt);
        Integer earnedPoints = attempt.getScore();
        Integer maxPoints = attempt.getTotalPoints();
        Integer scorePercent = percentage(
                earnedPoints,
                maxPoints
        );

        boolean detailed =
                policyService.canShowDetailedResult(
                        attempt.getStatus()
                );

        boolean revealCorrectAnswer =
                policyService.canRevealCorrectAnswer(
                        quiz,
                        attempt.getStatus(),
                        consumedAttempts
                );

        String globalFeedback = detailed
                ? Boolean.TRUE.equals(attempt.getSuccess())
                        ? quiz.getSuccessFeedback()
                        : quiz.getFailureFeedback()
                : null;

        List<LearnerQuestionResultResponse> questionResults =
                detailed
                ? questionResults(
                        attempt,
                        revealCorrectAnswer
                )
                : List.of();

        return new LearnerQuizAttemptResultResponse(
                attempt.getId(),
                attempt.getId(),
                attempt.getQuizId(),
                attempt.getLearnerId(),
                attempt.getStatus(),
                attempt.getStartedAt(),
                attempt.getSubmittedAt(),
                attempt.getScore(),
                attempt.getTotalPoints(),
                attempt.getSuccess(),
                attempt.getAnswers() == null
                        ? List.of()
                        : List.copyOf(attempt.getAnswers()),
                attemptNumber,
                durationSeconds,
                earnedPoints,
                maxPoints,
                scorePercent,
                attempt.getSuccess(),
                remainingAttempts,
                globalFeedback,
                quiz.getResultPolicy(),
                quiz.getCorrectAnswerPolicy(),
                questionResults
        );
    }

    private List<LearnerQuestionResultResponse> questionResults(
            QuizAttemptFullResponse attempt,
            boolean revealCorrectAnswer
    ) {
        QuizFullResponse quiz =
                evaluationService.getQuizFullDetails(
                        attempt.getQuizId()
                );

        Map<Long, QuestionAnswerResponse> byQuestion =
                new HashMap<>();

        if (attempt.getAnswers() != null) {
            for (QuestionAnswerResponse answer : attempt.getAnswers()) {
                byQuestion.put(
                        answer.getQuestionId(),
                        answer
                );
            }
        }

        if (quiz.getQuestions() == null) {
            return List.of();
        }

        return quiz.getQuestions()
                .stream()
                .map(question -> questionResult(
                        question,
                        byQuestion.get(question.getId()),
                        revealCorrectAnswer
                ))
                .toList();
    }

    private LearnerQuestionResultResponse questionResult(
            QuestionFullResponse question,
            QuestionAnswerResponse answer,
            boolean revealCorrectAnswer
    ) {
        int maxPoints = question.getPoints() == null
                ? 0
                : Math.max(0, question.getPoints());

        int pointsEarned = answer == null
                || answer.getPointsEarned() == null
                ? 0
                : Math.max(0, answer.getPointsEarned());

        QuestionResultStatus status =
                QuestionResultStatusResolver.resolve(
                        answer == null
                                ? null
                                : answer.getCorrect(),
                        pointsEarned,
                        maxPoints
                );

        SubmittedAnswerRequest learnerAnswer =
                answer == null
                ? null
                : learnerAnswer(answer);

        return new LearnerQuestionResultResponse(
                question.getId(),
                question.getContent(),
                question.getType(),
                status,
                pointsEarned,
                maxPoints,
                learnerAnswer,
                feedback(status, answer == null),
                revealCorrectAnswer
                        ? question.getExplanation()
                        : null,
                revealCorrectAnswer
                        ? correctAnswer(question)
                        : null
        );
    }

    private SubmittedAnswerRequest learnerAnswer(
            QuestionAnswerResponse answer
    ) {
        SubmittedAnswerRequest decoded =
                submittedAnswerCodec.read(
                        answer.getAnswerJson()
                );

        if (decoded != null) {
            return decoded;
        }

        SubmittedAnswerRequest fallback =
                new SubmittedAnswerRequest();
        fallback.setQuestionId(answer.getQuestionId());
        fallback.setSelectedOptionIds(
                parseOptionIds(
                        answer.getSelectedOptionIds()
                )
        );
        fallback.setAnswerText(answer.getAnswerText());
        return fallback;
    }

    private List<Long> parseOptionIds(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }

        try {
            return List.of(raw.split(","))
                    .stream()
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .map(Long::valueOf)
                    .toList();
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(
                    "Reponse historique optionnelle invalide.",
                    exception
            );
        }
    }

    private LearnerCorrectAnswerResponse correctAnswer(
            QuestionFullResponse question
    ) {
        List<LearnerAnswerOptionResponse> correctOptions =
                question.getOptions() == null
                ? List.of()
                : question.getOptions()
                        .stream()
                        .filter(
                                option ->
                                        Boolean.TRUE.equals(
                                                option.getCorrect()
                                        )
                        )
                        .map(LearnerAnswerOptionResponse::from)
                        .toList();

        return new LearnerCorrectAnswerResponse(
                correctOptions,
                question.getTypeConfig()
        );
    }

    private String feedback(
            QuestionResultStatus status,
            boolean unanswered
    ) {
        if (unanswered) {
            return "Aucune reponse fournie.";
        }

        return switch (status) {
            case CORRECT -> "Bonne reponse.";
            case PARTIAL -> "Reponse partiellement correcte.";
            case INCORRECT -> "Reponse incorrecte.";
        };
    }

    private boolean isConsumed(QuizAttemptResponse attempt) {
        return attempt.getStatus() == AttemptStatus.SUBMITTED;
    }

    private int attemptNumber(
            List<QuizAttemptResponse> attempts,
            Long attemptId
    ) {
        for (int index = 0; index < attempts.size(); index++) {
            if (
                    attemptId != null
                    && attemptId.equals(
                            attempts.get(index).getId()
                    )
            ) {
                return index + 1;
            }
        }

        return Math.max(1, attempts.size());
    }

    private int consumedThroughAttempt(
            List<QuizAttemptResponse> attempts,
            Long attemptId
    ) {
        int consumed = 0;

        for (QuizAttemptResponse candidate : attempts) {
            if (isConsumed(candidate)) {
                consumed++;
            }

            if (
                    attemptId != null
                    && attemptId.equals(candidate.getId())
            ) {
                break;
            }
        }

        return consumed;
    }

    private Integer remainingAttempts(
            Integer maxAttempts,
            int consumedAttempts
    ) {
        if (maxAttempts == null || maxAttempts <= 0) {
            return null;
        }

        return Math.max(
                0,
                maxAttempts - consumedAttempts
        );
    }

    private Long durationSeconds(
            QuizAttemptFullResponse attempt
    ) {
        if (
                attempt.getStartedAt() == null
                || attempt.getSubmittedAt() == null
        ) {
            return null;
        }

        return Math.max(
                0L,
                Duration.between(
                        attempt.getStartedAt(),
                        attempt.getSubmittedAt()
                ).getSeconds()
        );
    }

    private Integer percentage(
            Integer earnedPoints,
            Integer maxPoints
    ) {
        if (
                earnedPoints == null
                || maxPoints == null
                || maxPoints <= 0
        ) {
            return 0;
        }

        return Math.max(
                0,
                Math.min(
                        100,
                        (earnedPoints * 100) / maxPoints
                )
        );
    }
}
