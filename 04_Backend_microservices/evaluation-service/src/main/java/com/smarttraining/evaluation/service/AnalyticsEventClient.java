package com.smarttraining.evaluation.service;

import com.smarttraining.evaluation.analytics.QuizAnalyticsEvent;
import com.smarttraining.evaluation.dto.AnalyticsLearningEventRequest;
import com.smarttraining.evaluation.entity.Quiz;
import com.smarttraining.evaluation.entity.QuizAttempt;
import com.smarttraining.evaluation.enums.QuizStatus;
import com.smarttraining.evaluation.repository.QuizRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class AnalyticsEventClient {

    private final ApplicationEventPublisher eventPublisher;
    private final QuizRepository quizRepository;

    public AnalyticsEventClient(
        ApplicationEventPublisher eventPublisher,
        QuizRepository quizRepository
    ) {
        this.eventPublisher = eventPublisher;
        this.quizRepository = quizRepository;
    }

    public void publishQuizStarted(Quiz quiz, QuizAttempt attempt) {
        AnalyticsLearningEventRequest request =
            baseRequest(quiz, attempt, "QUIZ_STARTED", "started");

        request.setDescription("Quiz demarre : " + quiz.getTitle());
        publish(request);
    }

    public void publishQuizSubmitted(
        Quiz quiz,
        QuizAttempt attempt,
        int ignoredClientPercentage
    ) {
        AnalyticsLearningEventRequest submitted =
            baseRequest(quiz, attempt, "QUIZ_SUBMITTED", "submitted");

        submitted.setDescription("Quiz soumis : " + quiz.getTitle());
        submitted.setScore(attempt.getScore());
        submitted.setTotalPoints(attempt.getTotalPoints());
        publish(submitted);

        String resultType =
            Boolean.TRUE.equals(attempt.getSuccess())
                ? "QUIZ_PASSED"
                : "QUIZ_FAILED";

        AnalyticsLearningEventRequest result =
            baseRequest(
                quiz,
                attempt,
                resultType,
                Boolean.TRUE.equals(attempt.getSuccess()) ? "passed" : "failed"
            );

        result.setDescription(
            Boolean.TRUE.equals(attempt.getSuccess())
                ? "Quiz reussi : " + quiz.getTitle()
                : "Quiz echoue : " + quiz.getTitle()
        );

        publish(result);
    }

    private AnalyticsLearningEventRequest baseRequest(
        Quiz quiz,
        QuizAttempt attempt,
        String eventType,
        String suffix
    ) {
        if (quiz.getId() == null
            || quiz.getTrainingId() == null
            || attempt.getId() == null
            || attempt.getLearnerId() == null) {
            throw new IllegalStateException(
                "Impossible de publier un evenement analytics sans identifiants persistants."
            );
        }

        long publishedQuizCount = quizRepository
            .countByTrainingIdAndStatus(quiz.getTrainingId(), QuizStatus.PUBLISHED);

        AnalyticsLearningEventRequest request =
            new AnalyticsLearningEventRequest();

        request.setLearnerId(attempt.getLearnerId());
        request.setTrainingId(quiz.getTrainingId());
        request.setModuleId(quiz.getModuleId());
        request.setQuizId(quiz.getId());
        request.setAttemptId(attempt.getId());
        request.setEventType(eventType);
        request.setSource("EVALUATION_SERVICE");
        request.setIdempotencyKey(
            "evaluation:attempt:" + attempt.getId() + ":" + suffix
        );
        request.setTotalQuizzes(
            (int) Math.max(1L, publishedQuizCount)
        );

        return request;
    }

    private void publish(AnalyticsLearningEventRequest request) {
        eventPublisher.publishEvent(new QuizAnalyticsEvent(request));
    }
}