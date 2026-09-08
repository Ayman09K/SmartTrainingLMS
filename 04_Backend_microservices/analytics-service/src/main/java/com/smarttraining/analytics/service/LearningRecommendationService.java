package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.AiRiskPredictionRequest;
import com.smarttraining.analytics.dto.AiRiskPredictionResponse;
import com.smarttraining.analytics.dto.RecommendationResponse;
import com.smarttraining.analytics.entity.LearnerProgress;
import com.smarttraining.analytics.entity.LearningRecommendation;
import com.smarttraining.analytics.enums.ActionSource;
import com.smarttraining.analytics.enums.RecommendationPriority;
import com.smarttraining.analytics.enums.RecommendationStatus;
import com.smarttraining.analytics.enums.RecommendationType;
import com.smarttraining.analytics.repository.LearnerProgressRepository;
import com.smarttraining.analytics.repository.LearningEventRepository;
import com.smarttraining.analytics.repository.LearningRecommendationRepository;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class LearningRecommendationService {
    private final LearningRecommendationRepository learningRecommendationRepository;
    private final LearnerProgressRepository learnerProgressRepository;
    private final LearningEventRepository learningEventRepository;
    private final AiPredictionClient aiPredictionClient;

    public LearningRecommendationService(
            LearningRecommendationRepository learningRecommendationRepository,
            LearnerProgressRepository learnerProgressRepository,
            LearningEventRepository learningEventRepository,
            AiPredictionClient aiPredictionClient) {
        this.learningRecommendationRepository = learningRecommendationRepository;
        this.learnerProgressRepository = learnerProgressRepository;
        this.learningEventRepository = learningEventRepository;
        this.aiPredictionClient = aiPredictionClient;
    }

    @Transactional
    public List<RecommendationResponse> generateRecommendationsForLearnerTraining(
            Long learnerId, Long trainingId) {
        LearnerProgress progress = learnerProgressRepository
                .findByLearnerIdAndTrainingId(learnerId, trainingId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Progression introuvable pour learnerId=" + learnerId
                                + " et trainingId=" + trainingId));

        List<LearningRecommendation> generatedRecommendations = new ArrayList<>();
        int progressPercentage = valueOrZero(progress.getProgressPercentage());
        int averageScore = valueOrZero(progress.getAverageScore());
        int completedQuizzes = valueOrZero(progress.getCompletedQuizzes());
        int totalEvents = (int) learningEventRepository
                .countByLearnerIdAndTrainingId(learnerId, trainingId);
        int daysSinceLastActivity = computeDaysSinceLastActivity(progress);

        if (totalEvents == 0) {
            generatedRecommendations.add(createRecommendationIfNotProposed(
                    learnerId, trainingId, RecommendationType.CONTINUE_TRAINING,
                    RecommendationPriority.LOW, "Commencer la formation",
                    "Aucune activité n'est encore enregistrée. Commencez par la première leçon lorsque vous êtes prêt.",
                    ActionSource.RULE_BASED));

            return generatedRecommendations.stream()
                    .filter(recommendation -> recommendation != null)
                    .map(RecommendationResponse::new)
                    .toList();
        }

        if (totalEvents >= 3 && progressPercentage < 40) {
            generatedRecommendations.add(createRecommendationIfNotProposed(
                    learnerId, trainingId, RecommendationType.CONTINUE_TRAINING,
                    RecommendationPriority.HIGH, "Reprendre la formation",
                    "Votre progression est faible. Reprenez la formation et terminez les leçons restantes.",
                    ActionSource.RULE_BASED));
        }

        if (completedQuizzes > 0 && averageScore < 50) {
            generatedRecommendations.add(createRecommendationIfNotProposed(
                    learnerId, trainingId, RecommendationType.RETAKE_QUIZ,
                    RecommendationPriority.HIGH, "Refaire le quiz après révision",
                    "Votre score moyen est faible. Relisez les notions principales puis refaites le quiz.",
                    ActionSource.RULE_BASED));
        }

        if (daysSinceLastActivity > 21) {
            generatedRecommendations.add(createRecommendationIfNotProposed(
                    learnerId, trainingId, RecommendationType.CONTACT_TRAINER,
                    RecommendationPriority.MEDIUM, "Reprendre contact avec le formateur",
                    "Vous êtes inactif depuis plusieurs jours. Contactez le formateur ou planifiez une reprise.",
                    ActionSource.RULE_BASED));
        }

        if (totalEvents > 0 && totalEvents < 3) {
            generatedRecommendations.add(createRecommendationIfNotProposed(
                    learnerId, trainingId, RecommendationType.CONSULT_RESOURCE,
                    RecommendationPriority.MEDIUM, "Consulter les ressources complémentaires",
                    "Votre activité est faible. Consultez les ressources pédagogiques associées à la formation.",
                    ActionSource.RULE_BASED));
        }

        if (totalEvents >= 3) {
            AiRiskPredictionResponse aiResponse = tryPredictWithAi(
                    progress, totalEvents, daysSinceLastActivity);

            if (aiResponse != null
                    && (Integer.valueOf(1).equals(aiResponse.getPrediction())
                            || safeDouble(aiResponse.getRiskProbability()) >= 0.70)) {
                generatedRecommendations.add(createRecommendationIfNotProposed(
                        learnerId, trainingId, RecommendationType.CONTACT_TRAINER,
                        RecommendationPriority.HIGH, "Demander un accompagnement",
                        "Plusieurs signaux suggèrent qu'un échange avec le formateur pourrait vous aider.",
                        ActionSource.AI_BASED));
            }
        }

        return generatedRecommendations.stream()
                .filter(recommendation -> recommendation != null)
                .map(RecommendationResponse::new)
                .toList();
    }

    public List<RecommendationResponse> getRecommendationsByLearner(Long learnerId) {
        return learningRecommendationRepository.findByLearnerIdOrderByCreatedAtDesc(learnerId)
                .stream().map(RecommendationResponse::new).toList();
    }

    public List<RecommendationResponse> getRecommendationsByTraining(Long trainingId) {
        return learningRecommendationRepository.findByTrainingIdOrderByCreatedAtDesc(trainingId)
                .stream().map(RecommendationResponse::new).toList();
    }

    public RecommendationResponse getRecommendationById(Long recommendationId) {
        return new RecommendationResponse(getRecommendationEntity(recommendationId));
    }

    @Transactional
    public RecommendationResponse acceptRecommendation(Long recommendationId) {
        LearningRecommendation recommendation = getRecommendationEntity(recommendationId);
        recommendation.markAccepted();
        return new RecommendationResponse(learningRecommendationRepository.save(recommendation));
    }

    @Transactional
    public RecommendationResponse completeRecommendation(Long recommendationId) {
        LearningRecommendation recommendation = getRecommendationEntity(recommendationId);
        recommendation.markCompleted();
        return new RecommendationResponse(learningRecommendationRepository.save(recommendation));
    }

    @Transactional
    public RecommendationResponse dismissRecommendation(Long recommendationId) {
        LearningRecommendation recommendation = getRecommendationEntity(recommendationId);
        recommendation.markDismissed();
        return new RecommendationResponse(learningRecommendationRepository.save(recommendation));
    }

    private LearningRecommendation getRecommendationEntity(Long recommendationId) {
        return learningRecommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Recommandation introuvable avec id=" + recommendationId));
    }

    private LearningRecommendation createRecommendationIfNotProposed(
            Long learnerId,
            Long trainingId,
            RecommendationType recommendationType,
            RecommendationPriority priority,
            String title,
            String description,
            ActionSource source) {
        boolean alreadyProposed = learningRecommendationRepository
                .existsByLearnerIdAndTrainingIdAndRecommendationTypeAndStatus(
                        learnerId, trainingId, recommendationType,
                        RecommendationStatus.PROPOSED);
        if (alreadyProposed) {
            return null;
        }

        LearningRecommendation recommendation = new LearningRecommendation(
                learnerId, trainingId, recommendationType, priority,
                title, description, source);
        return learningRecommendationRepository.save(recommendation);
    }

    private AiRiskPredictionResponse tryPredictWithAi(
            LearnerProgress progress,
            int totalEvents,
            int daysSinceLastActivity) {
        try {
            Long learnerId = progress.getLearnerId();
            Long trainingId = progress.getTrainingId();
            List<LearnerProgress> learnerProgressItems =
                    learnerProgressRepository.findByLearnerId(learnerId);
            int totalTrainingsStarted = learnerProgressItems.size();
            int totalTrainingsCompleted = (int) learnerProgressItems.stream()
                    .filter(item -> item.getStatus() != null
                            && item.getStatus().toString().equals("COMPLETED"))
                    .count();

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
