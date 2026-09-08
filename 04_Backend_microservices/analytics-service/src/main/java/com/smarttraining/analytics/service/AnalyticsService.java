package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.*;
import com.smarttraining.analytics.entity.LearnerProgress;
import com.smarttraining.analytics.entity.LearningEvent;
import com.smarttraining.analytics.enums.LearningEventType;
import com.smarttraining.analytics.enums.ProgressStatus;
import com.smarttraining.analytics.enums.RiskLevel;
import com.smarttraining.analytics.enums.RiskFactorType;
import com.smarttraining.analytics.repository.LearnerProgressRepository;
import com.smarttraining.analytics.repository.LearningEventRepository;
import com.smarttraining.analytics.repository.TrainingReviewRepository;
import com.smarttraining.analytics.repository.FeedbackRepository;
import com.smarttraining.analytics.enums.FeedbackStatus;
import com.smarttraining.analytics.enums.DifficultyLevel;
import com.smarttraining.analytics.enums.DataStatus;
import com.smarttraining.analytics.entity.Feedback;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AnalyticsService {
    private final LearningEventRepository learningEventRepository;
    private final LearnerProgressRepository learnerProgressRepository;
    private final AiPredictionClient aiPredictionClient;
    private final TrainingReviewRepository trainingReviewRepository;
    private final FeedbackRepository feedbackRepository;

    public AnalyticsService(
        LearningEventRepository learningEventRepository,
        LearnerProgressRepository learnerProgressRepository,
        AiPredictionClient aiPredictionClient,
        TrainingReviewRepository trainingReviewRepository,
        FeedbackRepository feedbackRepository
) {
    this.learningEventRepository = learningEventRepository;
    this.learnerProgressRepository = learnerProgressRepository;
    this.aiPredictionClient = aiPredictionClient;
    this.trainingReviewRepository = trainingReviewRepository;
    this.feedbackRepository = feedbackRepository;
}

    public LearningEventResponse createLearningEvent(LearningEventRequest request) {
        LearningEvent event = new LearningEvent();
        event.setLearnerId(request.getLearnerId()); event.setTrainingId(request.getTrainingId());
        event.setModuleId(request.getModuleId()); event.setLessonId(request.getLessonId());
        event.setResourceId(request.getResourceId()); event.setQuizId(request.getQuizId());
        event.setAttemptId(request.getAttemptId()); event.setEventType(request.getEventType());
        event.setDescription(request.getDescription()); event.setScore(request.getScore());
        event.setTotalPoints(request.getTotalPoints()); event.setProgressPercentage(request.getProgressPercentage());
        event.setEventDate(LocalDateTime.now());
        return new LearningEventResponse(learningEventRepository.save(event));
    }

    @Transactional(readOnly = true)
    public List<LearningEventResponse> getAllEvents() { return learningEventRepository.findAll().stream().map(LearningEventResponse::new).toList(); }
    @Transactional(readOnly = true)
    public List<LearningEventResponse> getEventsByLearner(Long learnerId) { return learningEventRepository.findByLearnerIdOrderByEventDateDesc(learnerId).stream().map(LearningEventResponse::new).toList(); }
    @Transactional(readOnly = true)
    public List<LearningEventResponse> getEventsByTraining(Long trainingId) { return learningEventRepository.findByTrainingIdOrderByEventDateDesc(trainingId).stream().map(LearningEventResponse::new).toList(); }
    @Transactional(readOnly = true)
    public List<LearningEventResponse> getEventsByLearnerAndTraining(Long learnerId, Long trainingId) { return learningEventRepository.findByLearnerIdAndTrainingIdOrderByEventDateDesc(learnerId, trainingId).stream().map(LearningEventResponse::new).toList(); }
    @Transactional(readOnly = true)
    public List<LearningEventResponse> getEventsByLearnerAndType(Long learnerId, LearningEventType eventType) { return learningEventRepository.findByLearnerIdAndEventTypeOrderByEventDateDesc(learnerId, eventType).stream().map(LearningEventResponse::new).toList(); }

    public LearnerProgressResponse saveOrUpdateProgress(LearnerProgressRequest request) {
        LearnerProgress progress = learnerProgressRepository.findByLearnerIdAndTrainingId(request.getLearnerId(), request.getTrainingId()).orElseGet(LearnerProgress::new);
        progress.setLearnerId(request.getLearnerId()); progress.setTrainingId(request.getTrainingId());
        progress.setProgressPercentage(request.getProgressPercentage());
        progress.setCompletedLessons(valueOrZero(request.getCompletedLessons())); progress.setTotalLessons(valueOrZero(request.getTotalLessons()));
        progress.setCompletedQuizzes(valueOrZero(request.getCompletedQuizzes())); progress.setTotalQuizzes(valueOrZero(request.getTotalQuizzes()));
        progress.setAverageScore(valueOrZero(request.getAverageScore())); progress.setStatus(resolveProgressStatus(request));
        if (progress.getProgressPercentage() >= 100) { progress.setCompletedAt(LocalDateTime.now()); }
        else { progress.setCompletedAt(null); }
        return new LearnerProgressResponse(learnerProgressRepository.save(progress));
    }

    @Transactional(readOnly = true)
    public List<LearnerProgressResponse> getAllProgress() { return learnerProgressRepository.findAll().stream().map(LearnerProgressResponse::new).toList(); }
    @Transactional(readOnly = true)
    public List<LearnerProgressResponse> getProgressByLearner(Long learnerId) { return learnerProgressRepository.findByLearnerId(learnerId).stream().map(LearnerProgressResponse::new).toList(); }
    @Transactional(readOnly = true)
    public List<LearnerProgressResponse> getProgressByTraining(Long trainingId) { return learnerProgressRepository.findByTrainingId(trainingId).stream().map(LearnerProgressResponse::new).toList(); }
    @Transactional(readOnly = true)
    public LearnerProgressResponse getProgressByLearnerAndTraining(Long learnerId, Long trainingId) {
        LearnerProgress progress = learnerProgressRepository.findByLearnerIdAndTrainingId(learnerId, trainingId)
                .orElseThrow(() -> new IllegalArgumentException("Progression introuvable pour learnerId=" + learnerId + " et trainingId=" + trainingId));
        return new LearnerProgressResponse(progress);
    }
    @Transactional(readOnly = true)
    public List<LearnerProgressResponse> getAtRiskProgress() { return learnerProgressRepository.findByStatus(ProgressStatus.AT_RISK).stream().map(LearnerProgressResponse::new).toList(); }

    @Transactional(readOnly = true)
    public LearnerAnalyticsSummaryResponse getLearnerSummary(Long learnerId) {
        List<LearningEvent> events =
                learningEventRepository.findByLearnerIdOrderByEventDateDesc(learnerId);
        List<LearnerProgress> progressList =
                learnerProgressRepository.findByLearnerId(learnerId);

        return buildLearnerSummary(
                learnerId,
                events,
                progressList
        );
    }

    @Transactional(readOnly = true)
    public LearnerAnalyticsSummaryResponse getLearnerSummaryForTrainings(
            Long learnerId,
            List<Long> trainingIds
    ) {
        if (trainingIds == null || trainingIds.isEmpty()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Aucune formation autorisee pour cet apprenant."
            );
        }

        List<Long> allowedTrainingIds = trainingIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

        if (allowedTrainingIds.isEmpty()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Aucune formation autorisee pour cet apprenant."
            );
        }

        List<LearningEvent> events = allowedTrainingIds.stream()
                .flatMap(trainingId ->
                        learningEventRepository
                                .findByLearnerIdAndTrainingIdOrderByEventDateDesc(
                                        learnerId,
                                        trainingId
                                )
                                .stream()
                )
                .toList();

        List<LearnerProgress> progressList = allowedTrainingIds.stream()
                .map(trainingId ->
                        learnerProgressRepository.findByLearnerIdAndTrainingId(
                                learnerId,
                                trainingId
                        )
                )
                .flatMap(java.util.Optional::stream)
                .toList();

        return buildLearnerSummary(
                learnerId,
                events,
                progressList
        );
    }

    private LearnerAnalyticsSummaryResponse buildLearnerSummary(
            Long learnerId,
            List<LearningEvent> events,
            List<LearnerProgress> progressList
    ) {
        int completed = (int) progressList.stream()
                .filter(p -> p.getStatus() == ProgressStatus.COMPLETED)
                .count();

        int atRisk = (int) progressList.stream()
                .filter(p -> p.getStatus() == ProgressStatus.AT_RISK)
                .count();

        int averageProgress = progressList.isEmpty()
                ? 0
                : progressList.stream()
                        .map(LearnerProgress::getProgressPercentage)
                        .mapToInt(v -> v == null ? 0 : v)
                        .sum() / progressList.size();

        int averageScore = progressList.isEmpty()
                ? 0
                : progressList.stream()
                        .map(LearnerProgress::getAverageScore)
                        .mapToInt(v -> v == null ? 0 : v)
                        .sum() / progressList.size();

        return new LearnerAnalyticsSummaryResponse(
                learnerId,
                events.size(),
                progressList.size(),
                completed,
                averageProgress,
                averageScore,
                atRisk
        );
    }

    @Transactional(readOnly = true)
public RiskIndicatorResponse getLearnerRiskIndicator(Long learnerId) {
    List<LearningEvent> events = learningEventRepository.findByLearnerIdOrderByEventDateDesc(learnerId);
    List<LearnerProgress> progressList = learnerProgressRepository.findByLearnerId(learnerId);
    List<Feedback> feedbacks = feedbackRepository.findByLearnerIdOrderByCreatedAtDesc(learnerId);

    long reviewCount = trainingReviewRepository.countByLearnerId(learnerId);

    return buildRiskIndicator(learnerId, null, events, progressList, feedbacks, reviewCount);
}

    @Transactional(readOnly = true)
public RiskIndicatorResponse getLearnerTrainingRiskIndicator(Long learnerId, Long trainingId) {
    List<LearningEvent> events = learningEventRepository
            .findByLearnerIdAndTrainingIdOrderByEventDateDesc(learnerId, trainingId);

    List<LearnerProgress> progressList = learnerProgressRepository
            .findByLearnerIdAndTrainingId(learnerId, trainingId)
            .stream()
            .toList();

    List<Feedback> feedbacks = feedbackRepository
            .findByLearnerIdAndTrainingIdOrderByCreatedAtDesc(learnerId, trainingId);

    long reviewCount = trainingReviewRepository.countByLearnerIdAndTrainingId(learnerId, trainingId);

    return buildRiskIndicator(learnerId, trainingId, events, progressList, feedbacks, reviewCount);
}

    @Transactional(readOnly = true)
public LearnerAiRiskResponse predictLearnerRiskWithAi(Long learnerId, Long trainingId) {
    LearnerProgress progress = learnerProgressRepository
            .findByLearnerIdAndTrainingId(learnerId, trainingId)
            .orElseThrow(() -> new IllegalArgumentException(
                    "Progression introuvable pour learnerId=" + learnerId
                            + " et trainingId=" + trainingId));

    int totalEvents = Math.toIntExact(
            learningEventRepository.countByLearnerIdAndTrainingId(learnerId, trainingId));

    List<Feedback> feedbacks = feedbackRepository
            .findByLearnerIdAndTrainingIdOrderByCreatedAtDesc(learnerId, trainingId);

    long reviewCount = trainingReviewRepository.countByLearnerIdAndTrainingId(learnerId, trainingId);

    if (isDataInsufficient(List.of(progress), totalEvents, feedbacks, reviewCount)) {
        return new LearnerAiRiskResponse(
                learnerId,
                trainingId,
                0,
                "DATA_INSUFFICIENT",
                0.0,
                "DATA_INSUFFICIENT",
                DataStatus.INSUFFICIENT,
                "rule-based-guard",
                "1.0",
                "Données insuffisantes : le système ne classe pas l'apprenant à risque sans activité exploitable.",
                toDouble(progress.getProgressPercentage()),
                toDouble(progress.getAverageScore()),
                totalEvents,
                computeDaysSinceLastActivity(progress)
        );
    }

    List<LearnerProgress> learnerProgressList = learnerProgressRepository.findByLearnerId(learnerId);
    int totalTrainingsStarted = learnerProgressList.size();
    int totalTrainingsCompleted = (int) learnerProgressList.stream()
            .filter(item -> item.getStatus() == ProgressStatus.COMPLETED)
            .count();
    int daysSinceLastActivity = computeDaysSinceLastActivity(progress);

    AiRiskPredictionRequest request = new AiRiskPredictionRequest();
    request.setLearnerId(learnerId);
    request.setTrainingId(trainingId);
    request.setProgressPercentage(toDouble(progress.getProgressPercentage()));
    request.setAverageScore(toDouble(progress.getAverageScore()));
    request.setCompletedLessons(valueOrZero(progress.getCompletedLessons()));
    request.setTotalLessons(valueOrZero(progress.getTotalLessons()));
    request.setCompletedQuizzes(valueOrZero(progress.getCompletedQuizzes()));
    request.setTotalQuizzes(valueOrZero(progress.getTotalQuizzes()));
    request.setTotalEvents(totalEvents);
    request.setTotalTrainingsStarted(totalTrainingsStarted);
    request.setTotalTrainingsCompleted(totalTrainingsCompleted);
    request.setLessonCompletionRate(ratio(progress.getCompletedLessons(), progress.getTotalLessons()));
    request.setQuizCompletionRate(ratio(progress.getCompletedQuizzes(), progress.getTotalQuizzes()));
    request.setScoreRatio(ratio(progress.getAverageScore(), 100));
    request.setDaysSinceLastActivity(daysSinceLastActivity);
    request.setAvgEventsPerTraining(ratio(totalEvents, totalTrainingsStarted));

    AiRiskPredictionResponse aiResponse = aiPredictionClient.predictRisk(request);
    if (aiResponse == null) {
        throw new IllegalStateException("ai-service a retourné une réponse vide.");
    }

    return new LearnerAiRiskResponse(
            learnerId,
            trainingId,
            aiResponse.getPrediction(),
            aiResponse.getRiskLabel(),
            aiResponse.getRiskProbability(),
            aiResponse.getRiskLevel(),
            DataStatus.SUFFICIENT,
            aiResponse.getModelName(),
            aiResponse.getModelVersion(),
            aiResponse.getExplanation(),
            request.getProgressPercentage(),
            request.getAverageScore(),
            request.getTotalEvents(),
            request.getDaysSinceLastActivity()
    );
}

    private RiskIndicatorResponse buildRiskIndicator(
        Long learnerId,
        Long trainingId,
        List<LearningEvent> events,
        List<LearnerProgress> progressList,
        List<Feedback> feedbacks,
        long reviewCount
) {
    int totalEvents = events == null ? 0 : events.size();
    int totalFeedbacks = feedbacks == null ? 0 : feedbacks.size();

    if (isDataInsufficient(progressList, totalEvents, feedbacks, reviewCount)) {
        List<String> factors = new ArrayList<>();
        factors.add("Données insuffisantes pour calculer un risque fiable.");

        List<String> recommendations = new ArrayList<>();
        recommendations.add("Commencer la formation, consulter des ressources ou passer un quiz pour permettre une analyse pertinente.");

        RiskIndicatorResponse insufficientResponse = new RiskIndicatorResponse(
                learnerId,
                trainingId,
                0,
                RiskLevel.DATA_INSUFFICIENT,
                DataStatus.INSUFFICIENT,
                0,
                0,
                totalEvents,
                progressList == null ? 0 : progressList.size(),
                0,
                0,
                totalFeedbacks,
                0,
                factors,
                recommendations
        );

        insufficientResponse.setFactors(List.of(
                new RiskFactorResponse(
                        RiskFactorType.NO_ACTIVITY_YET,
                        "Pas encore assez d'activité",
                        "Aucune activité pédagogique suffisante ne permet encore de conclure à un risque.",
                        0
                )
        ));

        return insufficientResponse;
    }

    int totalTrainingsStarted = progressList.size();

    int totalTrainingsCompleted = (int) progressList.stream()
            .filter(progress -> progress.getStatus() == ProgressStatus.COMPLETED)
            .count();

    int atRiskTrainings = (int) progressList.stream()
            .filter(progress -> progress.getStatus() == ProgressStatus.AT_RISK)
            .count();

    int averageProgress = progressList.isEmpty() ? 0 : progressList.stream()
            .map(LearnerProgress::getProgressPercentage)
            .mapToInt(value -> value == null ? 0 : value)
            .sum() / progressList.size();

    int averageScore = progressList.isEmpty() ? 0 : progressList.stream()
            .map(LearnerProgress::getAverageScore)
            .mapToInt(value -> value == null ? 0 : value)
            .sum() / progressList.size();

    int helpRequests = feedbacks == null ? 0 : (int) feedbacks.stream()
            .filter(feedback -> Boolean.TRUE.equals(feedback.getNeedHelp()))
            .count();

    int hardFeedbacks = feedbacks == null ? 0 : (int) feedbacks.stream()
            .filter(feedback -> feedback.getDifficultyLevel() == DifficultyLevel.HARD
                    || feedback.getDifficultyLevel() == DifficultyLevel.VERY_HARD)
            .count();

    int openHelpRequests = feedbacks == null ? 0 : (int) feedbacks.stream()
            .filter(feedback -> Boolean.TRUE.equals(feedback.getNeedHelp()))
            .filter(feedback -> feedback.getStatus() == FeedbackStatus.OPEN
                    || feedback.getStatus() == FeedbackStatus.IN_PROGRESS)
            .count();

    int riskScore = 0;
    List<String> riskFactors = new ArrayList<>();
    List<String> recommendations = new ArrayList<>();
    List<RiskFactorResponse> factors = new ArrayList<>();

    if (averageProgress < 30) {
        riskScore += 25;
        riskFactors.add("Progression moyenne faible.");
        recommendations.add("Reprendre les leçons non terminées et viser une progression régulière.");
    } else if (averageProgress < 60) {
        riskScore += 12;
        riskFactors.add("Progression moyenne encore incomplète.");
        recommendations.add("Continuer les modules restants pour stabiliser l'apprentissage.");
    }

    if (averageScore > 0 && averageScore < 50) {
        riskScore += 25;
        riskFactors.add("Score moyen faible sur les évaluations.");
        recommendations.add("Réviser les notions difficiles puis refaire les quiz concernés.");
    } else if (averageScore >= 50 && averageScore < 70) {
        riskScore += 12;
        riskFactors.add("Score moyen perfectible.");
        recommendations.add("Renforcer les acquis avec des exercices ou ressources complémentaires.");
    }

    if (atRiskTrainings > 0) {
        riskScore += 20;
        riskFactors.add(atRiskTrainings + " formation(s) déjà signalée(s) à risque.");
        recommendations.add("Prioriser les formations où la progression ou les scores sont faibles.");
    }

    if (totalEvents < 3) {
        riskScore += 8;
        riskFactors.add("Activité récente faible.");
        recommendations.add("Consulter les ressources et reprendre une activité de formation.");
    }

    if (feedbacks != null) {
        for (Feedback feedback : feedbacks) {
            if (feedback.getDifficultyLevel() == DifficultyLevel.HARD) {
                riskScore += 15;
                riskFactors.add("Un feedback indique une difficulté élevée.");
                recommendations.add("Proposer une explication guidée ou un accompagnement sur le point difficile.");
                factors.add(new RiskFactorResponse(
                        RiskFactorType.FEEDBACK_DIFFICULTY,
                        "Difficulté signalée",
                        "L'apprenant a signalé une difficulté importante.",
                        15
                ));
            } else if (feedback.getDifficultyLevel() == DifficultyLevel.VERY_HARD) {
                riskScore += 25;
                riskFactors.add("Un feedback indique une très forte difficulté.");
                recommendations.add("Prioriser un accompagnement pédagogique sur le point signalé.");
                factors.add(new RiskFactorResponse(
                        RiskFactorType.FEEDBACK_DIFFICULTY,
                        "Difficulté forte signalée",
                        "L'apprenant a signalé une très forte difficulté.",
                        25
                ));
            }
        }
    }

    if (feedbacks != null) {
        for (Feedback feedback : feedbacks) {
            if (Boolean.TRUE.equals(feedback.getNeedHelp())) {
                riskScore += 20;
                riskFactors.add("Une demande d'aide pédagogique a été signalée.");
                recommendations.add("Le formateur doit prendre en charge la demande d'aide.");
                factors.add(new RiskFactorResponse(
                        RiskFactorType.HELP_REQUESTED,
                        "Demande d'aide",
                        "L'apprenant a demandé une aide pédagogique.",
                        20
                ));
            }
        }
    }

    if (totalTrainingsStarted > 0 && totalTrainingsCompleted == 0 && averageProgress >= 10) {
        riskScore += 5;
        riskFactors.add("Aucune formation commencée n'est encore terminée.");
        recommendations.add("Finaliser en priorité la formation la plus avancée.");
    }

    riskScore = Math.min(riskScore, 100);

    if (riskFactors.isEmpty()) {
        riskFactors.add("Aucun facteur de risque significatif détecté.");
        recommendations.add("Maintenir le rythme d'apprentissage actuel.");
    }

    RiskIndicatorResponse response = new RiskIndicatorResponse(
            learnerId,
            trainingId,
            riskScore,
            resolveRiskLevel(riskScore),
            DataStatus.SUFFICIENT,
            averageProgress,
            averageScore,
            totalEvents,
            totalTrainingsStarted,
            totalTrainingsCompleted,
            atRiskTrainings,
            totalFeedbacks,
            helpRequests,
            riskFactors,
            recommendations
    );

    response.setFactors(factors);
    return response;
}

    private boolean isDataInsufficient(
        List<LearnerProgress> progressList,
        int totalEvents,
        List<Feedback> feedbacks,
        long reviewCount
) {
    int progressItems = progressList == null ? 0 : progressList.size();

    int totalFeedbacks = feedbacks == null ? 0 : feedbacks.size();

    boolean hasProgressSignal = progressList != null && progressList.stream().anyMatch(progress ->
            valueOrZero(progress.getProgressPercentage()) > 0
                    || valueOrZero(progress.getCompletedLessons()) > 0
                    || valueOrZero(progress.getCompletedQuizzes()) > 0
                    || valueOrZero(progress.getAverageScore()) > 0
    );

    boolean hasInteractionSignal = totalEvents > 0 || totalFeedbacks > 0 || reviewCount > 0;

    return progressItems == 0 || (!hasProgressSignal && !hasInteractionSignal);
}

private RiskLevel resolveRiskLevel(Integer riskScore) {
    if (riskScore == null) {
        return RiskLevel.DATA_INSUFFICIENT;
    }

    if (riskScore >= 60) {
        return RiskLevel.HIGH;
    }

    if (riskScore >= 30) {
        return RiskLevel.MEDIUM;
    }

    return RiskLevel.LOW;
}

    private ProgressStatus resolveProgressStatus(LearnerProgressRequest request) {
        if (request.getStatus() != null) return request.getStatus();
        if (request.getProgressPercentage() >= 100) return ProgressStatus.COMPLETED;
        if (request.getAverageScore() != null && request.getAverageScore() < 50) return ProgressStatus.AT_RISK;
        if (request.getProgressPercentage() > 0) return ProgressStatus.IN_PROGRESS;
        return ProgressStatus.NOT_STARTED;
    }
    private Double toDouble(Integer value) { return value == null ? 0.0 : value.doubleValue(); }
    private Double ratio(Integer numerator, Integer denominator) {
        int safeNumerator = valueOrZero(numerator);
        int safeDenominator = valueOrZero(denominator);
        if (safeDenominator == 0) return 0.0;
        return Math.round((safeNumerator / (double) safeDenominator) * 10000.0) / 10000.0;
    }
    private int computeDaysSinceLastActivity(LearnerProgress progress) {
        if (progress.getLastActivityAt() == null) return 0;
        return Math.max(0, Math.toIntExact(
                Duration.between(progress.getLastActivityAt(), LocalDateTime.now()).toDays()));
    }
    private Integer valueOrZero(Integer value) { return value == null ? 0 : value; }
}
