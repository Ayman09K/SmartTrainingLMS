package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.AiRiskPredictionRequest;
import com.smarttraining.analytics.dto.AiRiskPredictionResponse;
import com.smarttraining.analytics.dto.AlertResponse;
import com.smarttraining.analytics.entity.LearnerProgress;
import com.smarttraining.analytics.entity.LearningAlert;
import com.smarttraining.analytics.enums.ActionSource;
import com.smarttraining.analytics.enums.AlertSeverity;
import com.smarttraining.analytics.enums.AlertStatus;
import com.smarttraining.analytics.enums.AlertType;
import com.smarttraining.analytics.repository.LearnerProgressRepository;
import com.smarttraining.analytics.repository.LearningAlertRepository;
import com.smarttraining.analytics.repository.LearningEventRepository;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class LearningAlertService {
    private final LearningAlertRepository learningAlertRepository;
    private final LearnerProgressRepository learnerProgressRepository;
    private final LearningEventRepository learningEventRepository;
    private final AiPredictionClient aiPredictionClient;

    public LearningAlertService(
            LearningAlertRepository learningAlertRepository,
            LearnerProgressRepository learnerProgressRepository,
            LearningEventRepository learningEventRepository,
            AiPredictionClient aiPredictionClient) {
        this.learningAlertRepository = learningAlertRepository;
        this.learnerProgressRepository = learnerProgressRepository;
        this.learningEventRepository = learningEventRepository;
        this.aiPredictionClient = aiPredictionClient;
    }

    @Transactional
    public List<AlertResponse> generateAlertsForLearnerTraining(Long learnerId, Long trainingId) {
        LearnerProgress progress = learnerProgressRepository
                .findByLearnerIdAndTrainingId(learnerId, trainingId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Progression introuvable pour learnerId=" + learnerId
                                + " et trainingId=" + trainingId));

        List<LearningAlert> generatedAlerts = new ArrayList<>();
        int progressPercentage = valueOrZero(progress.getProgressPercentage());
        int averageScore = valueOrZero(progress.getAverageScore());
        int completedQuizzes = valueOrZero(progress.getCompletedQuizzes());
        int totalEvents = (int) learningEventRepository
                .countByLearnerIdAndTrainingId(learnerId, trainingId);
        int daysSinceLastActivity = computeDaysSinceLastActivity(progress);

        if (totalEvents >= 3 && progressPercentage < 40) {
            generatedAlerts.add(createAlertIfNotOpen(
                    learnerId, trainingId, AlertType.LOW_PROGRESS, AlertSeverity.HIGH,
                    "Progression faible",
                    "La progression de l'apprenant est inférieure à 40 %. Un suivi pédagogique est recommandé.",
                    ActionSource.RULE_BASED, null));
        }

        if (completedQuizzes > 0 && averageScore < 50) {
            generatedAlerts.add(createAlertIfNotOpen(
                    learnerId, trainingId, AlertType.LOW_SCORE, AlertSeverity.HIGH,
                    "Score moyen faible",
                    "Le score moyen de l'apprenant est inférieur à 50 %. Une révision ou un accompagnement est conseillé.",
                    ActionSource.RULE_BASED, null));
        }

        if (daysSinceLastActivity > 21) {
            generatedAlerts.add(createAlertIfNotOpen(
                    learnerId, trainingId, AlertType.INACTIVITY, AlertSeverity.MEDIUM,
                    "Inactivité prolongée",
                    "L'apprenant n'a pas eu d'activité récente depuis plus de 21 jours.",
                    ActionSource.RULE_BASED, null));
        }

        if (totalEvents < 3) {
            generatedAlerts.add(createAlertIfNotOpen(
                    learnerId, trainingId, AlertType.LOW_ACTIVITY, AlertSeverity.MEDIUM,
                    "Activité insuffisante",
                    "Le nombre d'événements d'apprentissage est faible pour cette formation.",
                    ActionSource.RULE_BASED, null));
        }

        if (totalEvents >= 3) {
            AiRiskPredictionResponse aiResponse = tryPredictWithAi(
                    progress, totalEvents, daysSinceLastActivity);

            if (aiResponse != null
                    && (Integer.valueOf(1).equals(aiResponse.getPrediction())
                            || safeDouble(aiResponse.getRiskProbability()) >= 0.70)) {
                AlertSeverity severity =
                        safeDouble(aiResponse.getRiskProbability()) >= 0.70
                                ? AlertSeverity.HIGH
                                : AlertSeverity.MEDIUM;

                generatedAlerts.add(createAlertIfNotOpen(
                        learnerId, trainingId, AlertType.AI_RISK, severity,
                        "Risque pédagogique à examiner",
                        "Plusieurs signaux d'apprentissage justifient une vérification par le formateur.",
                        ActionSource.AI_BASED, aiResponse.getRiskProbability()));
            }
        }

        return generatedAlerts.stream()
                .filter(alert -> alert != null)
                .map(AlertResponse::new)
                .toList();
    }

    public List<AlertResponse> getAlertsByLearner(Long learnerId) {
        return learningAlertRepository.findByLearnerIdOrderByCreatedAtDesc(learnerId)
                .stream().map(AlertResponse::new).toList();
    }

    public List<AlertResponse> getAlertsByTraining(Long trainingId) {
        return learningAlertRepository.findByTrainingIdOrderByCreatedAtDesc(trainingId)
                .stream().map(AlertResponse::new).toList();
    }

    public List<AlertResponse> getOpenAlerts() {
        return learningAlertRepository.findByStatusOrderByCreatedAtDesc(AlertStatus.OPEN)
                .stream().map(AlertResponse::new).toList();
    }

    public AlertResponse getAlertById(Long alertId) {
        LearningAlert alert = learningAlertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Alerte introuvable avec id=" + alertId));
        return new AlertResponse(alert);
    }

    @Transactional
    public AlertResponse markInProgress(Long alertId) {
        LearningAlert alert = getAlertEntity(alertId);
        alert.markInProgress();
        return new AlertResponse(learningAlertRepository.save(alert));
    }

    @Transactional
    public AlertResponse resolveAlert(Long alertId) {
        LearningAlert alert = getAlertEntity(alertId);
        alert.markResolved();
        return new AlertResponse(learningAlertRepository.save(alert));
    }

    @Transactional
    public AlertResponse ignoreAlert(Long alertId) {
        LearningAlert alert = getAlertEntity(alertId);
        alert.markIgnored();
        return new AlertResponse(learningAlertRepository.save(alert));
    }

    private LearningAlert getAlertEntity(Long alertId) {
        return learningAlertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Alerte introuvable avec id=" + alertId));
    }

    private LearningAlert createAlertIfNotOpen(
            Long learnerId,
            Long trainingId,
            AlertType alertType,
            AlertSeverity severity,
            String title,
            String message,
            ActionSource source,
            Double riskProbability) {
        boolean alreadyOpen = learningAlertRepository
                .existsByLearnerIdAndTrainingIdAndAlertTypeAndStatus(
                        learnerId, trainingId, alertType, AlertStatus.OPEN);

        if (alreadyOpen) {
            return null;
        }

        LearningAlert alert = new LearningAlert(
                learnerId, trainingId, alertType, severity,
                title, message, source, riskProbability);
        return learningAlertRepository.save(alert);
    }

    private AiRiskPredictionResponse tryPredictWithAi(
            LearnerProgress progress,
            int totalEvents,
            int daysSinceLastActivity) {
        try {
            AiRiskPredictionRequest request = new AiRiskPredictionRequest();
            Long learnerId = progress.getLearnerId();
            Long trainingId = progress.getTrainingId();
            List<LearnerProgress> learnerProgressItems =
                    learnerProgressRepository.findByLearnerId(learnerId);
            int totalTrainingsStarted = learnerProgressItems.size();
            int totalTrainingsCompleted = (int) learnerProgressItems.stream()
                    .filter(item -> item.getStatus() != null
                            && item.getStatus().name().equals("COMPLETED"))
                    .count();

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
            request.setLessonCompletionRate(ratio(
                    progress.getCompletedLessons(), progress.getTotalLessons()));
            request.setQuizCompletionRate(ratio(
                    progress.getCompletedQuizzes(), progress.getTotalQuizzes()));
            request.setScoreRatio(ratio(progress.getAverageScore(), 100));
            request.setDaysSinceLastActivity(daysSinceLastActivity);
            request.setAvgEventsPerTraining(ratio(totalEvents, totalTrainingsStarted));

            return aiPredictionClient.predictRisk(request);
        } catch (Exception exception) {
            return null;
        }
    }

    private int computeDaysSinceLastActivity(LearnerProgress progress) {
        LocalDateTime lastActivityAt = progress.getLastActivityAt();
        if (lastActivityAt == null) {
            return 0;
        }
        return (int) Duration.between(lastActivityAt, LocalDateTime.now()).toDays();
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private Double toDouble(Integer value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    private Double ratio(Integer numerator, Integer denominator) {
        int safeNumerator = valueOrZero(numerator);
        int safeDenominator = valueOrZero(denominator);
        if (safeDenominator == 0) {
            return 0.0;
        }
        return Math.round((safeNumerator / (double) safeDenominator) * 10000.0) / 10000.0;
    }

    private Double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }
}
