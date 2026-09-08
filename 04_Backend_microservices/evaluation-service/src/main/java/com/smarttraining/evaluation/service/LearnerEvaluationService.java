package com.smarttraining.evaluation.service;

import com.smarttraining.evaluation.dto.LearnerQuizAttemptResultResponse;
import com.smarttraining.evaluation.dto.LearnerQuizResponse;
import com.smarttraining.evaluation.dto.LearnerStartAttemptRequest;
import com.smarttraining.evaluation.dto.QuizAttemptFullResponse;
import com.smarttraining.evaluation.dto.QuizAttemptResponse;
import com.smarttraining.evaluation.dto.QuizFullResponse;
import com.smarttraining.evaluation.dto.QuizResponse;
import com.smarttraining.evaluation.dto.StartAttemptRequest;
import com.smarttraining.evaluation.dto.SubmitAttemptRequest;
import com.smarttraining.evaluation.enums.AttemptStatus;
import com.smarttraining.evaluation.enums.QuizStatus;
import com.smarttraining.evaluation.exception.QuizAttemptRuleException;
import com.smarttraining.evaluation.integration.TrainingLearnerAccessClient;
import com.smarttraining.evaluation.security.AuthenticatedUser;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class LearnerEvaluationService {

    private final EvaluationService evaluationService;
    private final TrainingLearnerAccessClient trainingAccessClient;
    private final LearnerQuizResultService learnerQuizResultService;

    public LearnerEvaluationService(
            EvaluationService evaluationService,
            TrainingLearnerAccessClient trainingAccessClient,
            LearnerQuizResultService learnerQuizResultService
    ) {
        this.evaluationService = evaluationService;
        this.trainingAccessClient = trainingAccessClient;
        this.learnerQuizResultService = learnerQuizResultService;
    }

    public List<LearnerQuizResponse> getPublishedForTraining(
            Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = learner(authentication);
        requireTrainingAccess(trainingId, authentication);

        return evaluationService
                .getPublishedQuizzesByTraining(trainingId)
                .stream()
                .map(LearnerQuizResponse::summary)
                .toList();
    }

    public LearnerQuizResponse getQuiz(
            Long quizId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = learner(authentication);
        QuizResponse quiz = publishedQuiz(quizId);
        requireTrainingAccess(quiz.getTrainingId(), authentication);

        QuizFullResponse full = evaluationService.getQuizFullDetails(quizId);
        return LearnerQuizResponse.full(full, actor.getUserId());
    }

    public QuizAttemptResponse start(
            LearnerStartAttemptRequest request,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = learner(authentication);
        QuizResponse quiz = publishedQuiz(request.getQuizId());
        requireTrainingAccess(quiz.getTrainingId(), authentication);

        List<QuizAttemptResponse> existing =
                evaluationService.getAttemptsByLearnerAndQuiz(
                        actor.getUserId(),
                        quiz.getId()
                );

        int consumedAttempts = 0;

        for (QuizAttemptResponse attempt : existing) {
            if (attempt.getStatus() == AttemptStatus.STARTED) {
                if (isExpired(attempt, quiz)) {
                    // Timeout is preserved as CANCELLED in history, but does not
                    // consume one of the learner's configured attempts.
                    evaluationService.cancelAttemptForTimeout(attempt.getId());
                } else {
                    throw new QuizAttemptRuleException(
                            "Une tentative est deja en cours pour ce quiz."
                    );
                }
            } else if (
                    attempt.getStatus() == AttemptStatus.SUBMITTED
            ) {
                consumedAttempts++;
            }
        }

        if (
                quiz.getMaxAttempts() != null
                && quiz.getMaxAttempts() > 0
                && consumedAttempts >= quiz.getMaxAttempts()
        ) {
            throw new QuizAttemptRuleException(
                    "Le nombre maximum de tentatives est atteint."
            );
        }

        StartAttemptRequest trusted = new StartAttemptRequest();
        trusted.setQuizId(request.getQuizId());
        trusted.setLearnerId(actor.getUserId());

        return evaluationService.startAttempt(trusted);
    }

    public LearnerQuizAttemptResultResponse submit(
            Long attemptId,
            SubmitAttemptRequest request,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = learner(authentication);
        QuizAttemptFullResponse attempt =
                requireOwnAttempt(attemptId, actor);

        QuizResponse quiz = publishedQuiz(attempt.getQuizId());
        requireTrainingAccess(quiz.getTrainingId(), authentication);

        if (attempt.getStatus() != AttemptStatus.STARTED) {
            throw new QuizAttemptRuleException(
                    "Cette tentative n'est plus ouverte."
            );
        }

        if (isExpired(attempt, quiz)) {
            evaluationService.cancelAttemptForTimeout(attemptId);
            throw new QuizAttemptRuleException(
                    "Le temps imparti pour cette tentative est depasse."
            );
        }

        QuizAttemptFullResponse submitted =
                evaluationService.submitAttempt(
                        attemptId,
                        request
                );

        return learnerQuizResultService.build(submitted);
    }

    public LearnerQuizAttemptResultResponse getAttempt(
            Long attemptId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = learner(authentication);
        QuizAttemptFullResponse attempt =
                requireOwnAttempt(attemptId, actor);

        QuizResponse quiz = evaluationService.getQuizById(attempt.getQuizId());
        requireTrainingAccess(quiz.getTrainingId(), authentication);

        if (
                attempt.getStatus() == AttemptStatus.STARTED
                && isExpired(attempt, quiz)
        ) {
            evaluationService.cancelAttemptForTimeout(attemptId);
            return learnerQuizResultService.build(
                    evaluationService.getAttemptFullDetails(
                            attemptId
                    )
            );
        }

        return learnerQuizResultService.build(attempt);
    }

    public List<QuizAttemptResponse> getMyAttempts(
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = learner(authentication);
        List<QuizAttemptResponse> current =
                evaluationService.getAttemptsByLearner(actor.getUserId());

        expireStartedAttempts(current);

        return evaluationService
                .getAttemptsByLearner(actor.getUserId())
                .stream()
                .sorted(attemptComparator())
                .toList();
    }

    public List<QuizAttemptResponse> getMyAttemptsForQuiz(
            Long quizId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = learner(authentication);
        QuizResponse quiz = publishedQuiz(quizId);
        requireTrainingAccess(quiz.getTrainingId(), authentication);

        List<QuizAttemptResponse> current =
                evaluationService.getAttemptsByLearnerAndQuiz(
                        actor.getUserId(),
                        quizId
                );

        for (QuizAttemptResponse attempt : current) {
            if (
                    attempt.getStatus() == AttemptStatus.STARTED
                    && isExpired(attempt, quiz)
            ) {
                evaluationService.cancelAttemptForTimeout(attempt.getId());
            }
        }

        return evaluationService
                .getAttemptsByLearnerAndQuiz(actor.getUserId(), quizId)
                .stream()
                .sorted(attemptComparator())
                .toList();
    }

    private void expireStartedAttempts(
            List<QuizAttemptResponse> attempts
    ) {
        for (QuizAttemptResponse attempt : attempts) {
            if (attempt.getStatus() != AttemptStatus.STARTED) {
                continue;
            }

            QuizResponse quiz =
                    evaluationService.getQuizById(attempt.getQuizId());

            if (isExpired(attempt, quiz)) {
                evaluationService.cancelAttemptForTimeout(attempt.getId());
            }
        }
    }

    private boolean isExpired(
            QuizAttemptResponse attempt,
            QuizResponse quiz
    ) {
        return isExpired(
                attempt.getStartedAt(),
                quiz.getTimeLimitMinutes()
        );
    }

    private boolean isExpired(
            QuizAttemptFullResponse attempt,
            QuizResponse quiz
    ) {
        return isExpired(
                attempt.getStartedAt(),
                quiz.getTimeLimitMinutes()
        );
    }

    private boolean isExpired(
            LocalDateTime startedAt,
            Integer timeLimitMinutes
    ) {
        if (
                startedAt == null
                || timeLimitMinutes == null
                || timeLimitMinutes <= 0
        ) {
            return false;
        }

        LocalDateTime deadline =
                startedAt.plusMinutes(timeLimitMinutes);

        return !LocalDateTime.now().isBefore(deadline);
    }

    private Comparator<QuizAttemptResponse> attemptComparator() {
        return Comparator.comparing(
                QuizAttemptResponse::getStartedAt,
                Comparator.nullsLast(Comparator.naturalOrder())
        ).reversed();
    }

    private AuthenticatedUser learner(
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        actor.requireLearner();
        return actor;
    }

    private QuizResponse publishedQuiz(Long quizId) {
        QuizResponse quiz = evaluationService.getQuizById(quizId);

        if (quiz.getStatus() != QuizStatus.PUBLISHED) {
            throw new AccessDeniedException(
                    "Ce quiz n'est pas disponible pour l'apprenant."
            );
        }

        return quiz;
    }

    private QuizAttemptFullResponse requireOwnAttempt(
            Long attemptId,
            AuthenticatedUser actor
    ) {
        QuizAttemptFullResponse attempt =
                evaluationService.getAttemptFullDetails(attemptId);

        if (!actor.getUserId().equals(attempt.getLearnerId())) {
            throw new AccessDeniedException(
                    "Cette tentative ne vous appartient pas."
            );
        }

        return attempt;
    }

    private void requireTrainingAccess(
            Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        trainingAccessClient.requireEnrollment(
                trainingId,
                authentication.getToken().getTokenValue()
        );
    }
}