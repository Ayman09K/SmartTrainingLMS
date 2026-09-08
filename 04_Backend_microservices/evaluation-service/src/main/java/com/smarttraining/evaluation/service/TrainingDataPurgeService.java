package com.smarttraining.evaluation.service;

import jakarta.persistence.EntityManager;
import java.util.List;
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

        List<Long> quizIds = entityManager.createQuery(
                        "select q.id from Quiz q where q.trainingId = :trainingId",
                        Long.class
                )
                .setParameter("trainingId", trainingId)
                .getResultList();

        if (quizIds.isEmpty()) {
            return 0L;
        }

        List<Long> questionIds = entityManager.createQuery(
                        "select q.id from Question q where q.quiz.id in :quizIds",
                        Long.class
                )
                .setParameter("quizIds", quizIds)
                .getResultList();

        List<Long> attemptIds = entityManager.createQuery(
                        "select a.id from QuizAttempt a where a.quizId in :quizIds",
                        Long.class
                )
                .setParameter("quizIds", quizIds)
                .getResultList();

        long deleted = 0L;

        if (!attemptIds.isEmpty()) {
            deleted += entityManager.createQuery(
                            "delete from QuestionAnswer a where a.attempt.id in :attemptIds"
                    )
                    .setParameter("attemptIds", attemptIds)
                    .executeUpdate();
        }

        deleted += entityManager.createQuery(
                        "delete from QuizAttempt a where a.quizId in :quizIds"
                )
                .setParameter("quizIds", quizIds)
                .executeUpdate();

        if (!questionIds.isEmpty()) {
            deleted += entityManager.createQuery(
                            "delete from AnswerOption o where o.question.id in :questionIds"
                    )
                    .setParameter("questionIds", questionIds)
                    .executeUpdate();
        }

        deleted += entityManager.createQuery(
                        "delete from Question q where q.quiz.id in :quizIds"
                )
                .setParameter("quizIds", quizIds)
                .executeUpdate();

        deleted += entityManager.createQuery(
                        "delete from Quiz q where q.id in :quizIds"
                )
                .setParameter("quizIds", quizIds)
                .executeUpdate();

        entityManager.flush();
        return deleted;
    }

    private void requireTrainingId(Long trainingId) {
        if (trainingId == null || trainingId <= 0L) {
            throw new IllegalArgumentException("trainingId invalide.");
        }
    }
}