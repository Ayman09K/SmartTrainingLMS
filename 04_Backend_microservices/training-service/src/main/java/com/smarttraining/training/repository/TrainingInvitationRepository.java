package com.smarttraining.training.repository;

import com.smarttraining.training.entity.TrainingInvitation;
import com.smarttraining.training.enums.TrainingInvitationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrainingInvitationRepository extends JpaRepository<TrainingInvitation, Long> {

    @Query("""
            SELECT i
            FROM TrainingInvitation i
            JOIN FETCH i.training
            WHERE i.token = :token
            """)
    Optional<TrainingInvitation> findByTokenWithTraining(@Param("token") String token);

    @Query("""
            SELECT i
            FROM TrainingInvitation i
            JOIN FETCH i.training
            WHERE i.training.id = :trainingId
            ORDER BY i.createdAt DESC
            """)
    List<TrainingInvitation> findByTrainingIdWithTraining(
            @Param("trainingId") Long trainingId
    );

    @Query("""
            SELECT i
            FROM TrainingInvitation i
            JOIN FETCH i.training
            WHERE i.learnerId = :learnerId
            ORDER BY i.createdAt DESC
            """)
    List<TrainingInvitation> findByLearnerIdWithTraining(
            @Param("learnerId") Long learnerId
    );

    @Query("""
            SELECT i
            FROM TrainingInvitation i
            JOIN FETCH i.training t
            WHERE i.learnerId = :learnerId
              AND (t.ownerId = :actorId OR t.trainerId = :actorId)
            ORDER BY i.createdAt DESC
            """)
    List<TrainingInvitation> findManagedByLearnerIdWithTraining(
            @Param("learnerId") Long learnerId,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT i
            FROM TrainingInvitation i
            JOIN FETCH i.training
            WHERE LOWER(i.learnerEmail) = LOWER(:learnerEmail)
            ORDER BY i.createdAt DESC
            """)
    List<TrainingInvitation> findByLearnerEmailWithTraining(
            @Param("learnerEmail") String learnerEmail
    );

    @Query("""
            SELECT i
            FROM TrainingInvitation i
            JOIN FETCH i.training t
            WHERE LOWER(i.learnerEmail) = LOWER(:learnerEmail)
              AND (t.ownerId = :actorId OR t.trainerId = :actorId)
            ORDER BY i.createdAt DESC
            """)
    List<TrainingInvitation> findManagedByLearnerEmailWithTraining(
            @Param("learnerEmail") String learnerEmail,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT i
            FROM TrainingInvitation i
            JOIN FETCH i.training
            WHERE i.status = :status
            ORDER BY i.createdAt DESC
            """)
    List<TrainingInvitation> findByStatusWithTraining(
            @Param("status") TrainingInvitationStatus status
    );

    @Query("""
            SELECT i
            FROM TrainingInvitation i
            JOIN FETCH i.training t
            WHERE i.status = :status
              AND (t.ownerId = :actorId OR t.trainerId = :actorId)
            ORDER BY i.createdAt DESC
            """)
    List<TrainingInvitation> findManagedByStatusWithTraining(
            @Param("status") TrainingInvitationStatus status,
            @Param("actorId") Long actorId
    );

    @Query("""
            SELECT COUNT(i)
            FROM TrainingInvitation i
            JOIN i.training t
            WHERE i.id = :invitationId
              AND (t.ownerId = :actorId OR t.trainerId = :actorId)
            """)
    long countManageableInvitation(
            @Param("invitationId") Long invitationId,
            @Param("actorId") Long actorId
    );
}
