package com.smarttraining.training.repository;

import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.enums.EnrollmentStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    List<Enrollment> findByLearnerId(Long learnerId);

    List<Enrollment> findByTrainingId(Long trainingId);

    List<Enrollment> findByLearnerIdAndStatus(Long learnerId, EnrollmentStatus status);

    Optional<Enrollment> findByLearnerIdAndTrainingId(Long learnerId, Long trainingId);

    boolean existsByLearnerIdAndTrainingIdAndStatusNot(
            Long learnerId,
            Long trainingId,
            EnrollmentStatus status
    );

    default boolean existsByLearnerIdAndTrainingId(
            Long learnerId,
            Long trainingId
    ) {
        return existsByLearnerIdAndTrainingIdAndStatusNot(
                learnerId,
                trainingId,
                EnrollmentStatus.CANCELLED
        );
    }

    @Query("SELECT e FROM Enrollment e JOIN FETCH e.training WHERE e.learnerId = :learnerId")
    List<Enrollment> findByLearnerIdWithTraining(@Param("learnerId") Long learnerId);

    @Query("""
            SELECT e
            FROM Enrollment e
            JOIN FETCH e.training t
            WHERE e.learnerId = :learnerId
              AND (t.ownerId = :actorId OR t.trainerId = :actorId)
            """)
    List<Enrollment> findManagedByLearnerIdWithTraining(
            @Param("learnerId") Long learnerId,
            @Param("actorId") Long actorId
    );

    @Query("SELECT e FROM Enrollment e JOIN FETCH e.training WHERE e.training.id = :trainingId")
    List<Enrollment> findByTrainingIdWithTraining(@Param("trainingId") Long trainingId);

    @Query("SELECT e FROM Enrollment e JOIN FETCH e.training WHERE e.learnerId = :learnerId AND e.status = :status")
    List<Enrollment> findByLearnerIdAndStatusWithTraining(
            @Param("learnerId") Long learnerId,
            @Param("status") EnrollmentStatus status
    );

    @Query("""
            SELECT COUNT(a.id)
            FROM LearningPathAssignment a
            WHERE a.learnerId = :learnerId
              AND EXISTS (
                  SELECT s.id
                  FROM LearningPathStep s
                  WHERE s.pathId = a.pathId
                    AND s.trainingId = :trainingId
              )
            """)
    long countLearningPathRequirements(
            @Param("learnerId") Long learnerId,
            @Param("trainingId") Long trainingId
    );

    @Query("""
            SELECT COUNT(e)
            FROM Enrollment e
            JOIN e.training t
            WHERE e.id = :enrollmentId
              AND (t.ownerId = :actorId OR t.trainerId = :actorId)
            """)
    long countManageableEnrollment(
            @Param("enrollmentId") Long enrollmentId,
            @Param("actorId") Long actorId
    );
}
