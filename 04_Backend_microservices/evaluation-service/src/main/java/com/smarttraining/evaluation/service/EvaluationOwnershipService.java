package com.smarttraining.evaluation.service;

import com.smarttraining.evaluation.dto.QuizAttemptResponse;
import com.smarttraining.evaluation.dto.QuizResponse;
import com.smarttraining.evaluation.dto.ScoreResponse;
import com.smarttraining.evaluation.entity.AnswerOption;
import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.entity.Quiz;
import com.smarttraining.evaluation.entity.QuizAttempt;
import com.smarttraining.evaluation.integration.TrainingManagementAccessClient;
import com.smarttraining.evaluation.integration.TrainingManagementAccessClient.TrainingScope;
import com.smarttraining.evaluation.repository.AnswerOptionRepository;
import com.smarttraining.evaluation.repository.QuestionRepository;
import com.smarttraining.evaluation.repository.QuizAttemptRepository;
import com.smarttraining.evaluation.repository.QuizRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class EvaluationOwnershipService {

    private final QuizRepository quizzes;
    private final QuestionRepository questions;
    private final AnswerOptionRepository options;
    private final QuizAttemptRepository attempts;
    private final TrainingManagementAccessClient trainingAccess;

    public EvaluationOwnershipService(
            QuizRepository quizzes,
            QuestionRepository questions,
            AnswerOptionRepository options,
            QuizAttemptRepository attempts,
            TrainingManagementAccessClient trainingAccess
    ) {
        this.quizzes = quizzes;
        this.questions = questions;
        this.options = options;
        this.attempts = attempts;
        this.trainingAccess = trainingAccess;
    }

    public void assertCanManageTraining(
            Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        trainingAccess.requireManageTraining(trainingId, jwt(authentication));
    }

    public void assertCanManageTrainingAndModule(
            Long trainingId,
            Long moduleId,
            JwtAuthenticationToken authentication
    ) {
        TrainingScope scope = trainingAccess.requireManageTraining(
                trainingId,
                jwt(authentication)
        );

        if (moduleId != null && !scope.moduleIds().contains(moduleId)) {
            throw new IllegalArgumentException(
                    "Le module n'appartient pas a la formation indiquee."
            );
        }
    }

    public void assertCanManageQuiz(
            Long quizId,
            JwtAuthenticationToken authentication
    ) {
        Quiz quiz = quiz(quizId);
        assertCanManageTraining(quiz.getTrainingId(), authentication);
    }

    public void assertCanManageQuestion(
            Long questionId,
            JwtAuthenticationToken authentication
    ) {
        Question question = question(questionId);
        if (question.getQuiz() == null || question.getQuiz().getId() == null) {
            throw new IllegalStateException("Question sans quiz exploitable.");
        }
        assertCanManageQuiz(question.getQuiz().getId(), authentication);
    }

    public void assertCanManageOption(
            Long optionId,
            JwtAuthenticationToken authentication
    ) {
        AnswerOption option = option(optionId);
        if (option.getQuestion() == null || option.getQuestion().getId() == null) {
            throw new IllegalStateException("Option sans question exploitable.");
        }
        assertCanManageQuestion(option.getQuestion().getId(), authentication);
    }

    public void assertCanManageAttempt(
            Long attemptId,
            JwtAuthenticationToken authentication
    ) {
        QuizAttempt attempt = attempt(attemptId);
        if (attempt.getQuizId() == null) {
            throw new IllegalStateException("Tentative sans quiz exploitable.");
        }
        assertCanManageQuiz(attempt.getQuizId(), authentication);
    }

    public List<QuizResponse> filterManageableQuizzes(
            List<QuizResponse> source,
            JwtAuthenticationToken authentication
    ) {
        if (isAdmin(authentication)) {
            return source;
        }

        String jwt = jwt(authentication);
        Map<Long, Boolean> cache = new HashMap<>();

        return source.stream()
                .filter(item -> canManageTrainingCached(
                        item.getTrainingId(), jwt, cache
                ))
                .toList();
    }

    public List<QuizAttemptResponse> filterManageableAttempts(
            List<QuizAttemptResponse> source,
            JwtAuthenticationToken authentication
    ) {
        if (isAdmin(authentication)) {
            return source;
        }

        String jwt = jwt(authentication);
        Map<Long, Boolean> cache = new HashMap<>();

        return source.stream()
                .filter(item -> canManageQuizCached(
                        item.getQuizId(), jwt, cache
                ))
                .toList();
    }

    public List<ScoreResponse> filterManageableScores(
            List<ScoreResponse> source,
            JwtAuthenticationToken authentication
    ) {
        if (isAdmin(authentication)) {
            return source;
        }

        String jwt = jwt(authentication);
        Map<Long, Boolean> cache = new HashMap<>();

        return source.stream()
                .filter(item -> canManageQuizCached(
                        item.getQuizId(), jwt, cache
                ))
                .toList();
    }

    private boolean canManageQuizCached(
            Long quizId,
            String jwt,
            Map<Long, Boolean> trainingCache
    ) {
        if (quizId == null) {
            return false;
        }

        Quiz quiz = quizzes.findById(quizId).orElse(null);
        if (quiz == null || quiz.getTrainingId() == null) {
            return false;
        }

        return canManageTrainingCached(
                quiz.getTrainingId(),
                jwt,
                trainingCache
        );
    }

    private boolean canManageTrainingCached(
            Long trainingId,
            String jwt,
            Map<Long, Boolean> cache
    ) {
        if (trainingId == null) {
            return false;
        }

        Boolean cached = cache.get(trainingId);
        if (cached != null) {
            return cached;
        }

        boolean allowed = trainingAccess.canManageTraining(trainingId, jwt);
        cache.put(trainingId, allowed);
        return allowed;
    }

    private boolean isAdmin(JwtAuthenticationToken authentication) {
        String role = authentication == null
                ? null
                : authentication.getToken().getClaimAsString("role");

        if (role == null || role.isBlank()) {
            throw new AccessDeniedException("Role JWT staff absent.");
        }

        return "ADMIN".equals(role.trim().toUpperCase(Locale.ROOT));
    }

    private String jwt(JwtAuthenticationToken authentication) {
        if (authentication == null
                || authentication.getToken() == null
                || authentication.getToken().getTokenValue() == null
                || authentication.getToken().getTokenValue().isBlank()) {
            throw new AccessDeniedException("JWT staff absent.");
        }
        return authentication.getToken().getTokenValue();
    }

    private Quiz quiz(Long id) {
        return quizzes.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Quiz introuvable avec l'id : " + id
                ));
    }

    private Question question(Long id) {
        return questions.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Question introuvable avec l'id : " + id
                ));
    }

    private AnswerOption option(Long id) {
        return options.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Option introuvable avec l'id : " + id
                ));
    }

    private QuizAttempt attempt(Long id) {
        return attempts.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Tentative introuvable avec l'id : " + id
                ));
    }
}
