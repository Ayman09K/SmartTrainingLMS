package com.smarttraining.analytics.service;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainingDataPurgeService {

    private final EntityManager entityManager;

    public TrainingDataPurgeService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Transactional
    public long purgeTraining(Long trainingId) {
        requireTrainingId(trainingId);

        long deleted = 0L;

        deleted += delete("AssistantMessage", trainingId);
        deleted += delete("Feedback", trainingId);
        deleted += delete("LearnerNotification", trainingId);
        deleted += delete("LearnerProgress", trainingId);
        deleted += delete("LearningAlert", trainingId);
        deleted += delete("LearningEvent", trainingId);
        deleted += delete("LearningIntervention", trainingId);
        deleted += delete("LearningRecommendation", trainingId);
        deleted += delete("SupportSession", trainingId);
        deleted += delete("TrainingReview", trainingId);

        entityManager.flush();
        return deleted;
    }

    private int delete(String entityName, Long trainingId) {
        return entityManager.createQuery(
                        "delete from " + entityName + " e where e.trainingId = :trainingId"
                )
                .setParameter("trainingId", trainingId)
                .executeUpdate();
    }

    private void requireTrainingId(Long trainingId) {
        if (trainingId == null || trainingId <= 0L) {
            throw new IllegalArgumentException("trainingId invalide.");
        }
    }
}