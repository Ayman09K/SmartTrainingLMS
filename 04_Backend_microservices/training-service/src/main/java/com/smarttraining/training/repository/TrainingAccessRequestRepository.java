package com.smarttraining.training.repository;

import com.smarttraining.training.entity.TrainingAccessRequest;
import com.smarttraining.training.enums.TrainingAccessRequestStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrainingAccessRequestRepository extends JpaRepository<TrainingAccessRequest, Long> {

    @Query("""
            SELECT r
            FROM TrainingAccessRequest r
            JOIN FETCH r.training
            WHERE r.learnerId = :learnerId
            ORDER BY r.requestedAt DESC
            """)
    List<TrainingAccessRequest> findByLearnerIdWithTraining(
            @Param("learnerId") Long learnerId
    );

    @Query("""
            SELECT r
            FROM TrainingAccessRequest r
            JOIN FETCH r.training t
            WHERE r.learnerId = :learnerId
              AND (t.ownerId = :actorId OR t.trainerId = :actorId)
            ORDER BY r.requestedAt DESC
            """)
    List<TrainingAccessRequest> findManagedByLearnerIdWithTraining(
            @Param("learnerId") Long learnerId,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT r
            FROM TrainingAccessRequest r
            JOIN FETCH r.training
            WHERE r.training.id = :trainingId
            ORDER BY r.requestedAt DESC
            """)
    List<TrainingAccessRequest> findByTrainingIdWithTraining(
            @Param("trainingId") Long trainingId
    );

    @Query("""
            SELECT r
            FROM TrainingAccessRequest r
            JOIN FETCH r.training
            WHERE r.status = :status
            ORDER BY r.requestedAt DESC
            """)
    List<TrainingAccessRequest> findByStatusWithTraining(
            @Param("status") TrainingAccessRequestStatus status
    );

    @Query("""
            SELECT r
            FROM TrainingAccessRequest r
            JOIN FETCH r.training t
            WHERE r.status = :status
              AND (t.ownerId = :actorId OR t.trainerId = :actorId)
            ORDER BY r.requestedAt DESC
            """)
    List<TrainingAccessRequest> findManagedByStatusWithTraining(
            @Param("status") TrainingAccessRequestStatus status,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT COUNT(r)
            FROM TrainingAccessRequest r
            JOIN r.training t
            WHERE r.id = :requestId
              AND (t.ownerId = :actorId OR t.trainerId = :actorId)
            """)
    long countManageableRequest(
            @Param("requestId") Long requestId,
            @Param("actorId") Long actorId
    );

    boolean existsByLearnerIdAndTrainingIdAndStatus(
            Long learnerId,
            Long trainingId,
            TrainingAccessRequestStatus status
    );
}
