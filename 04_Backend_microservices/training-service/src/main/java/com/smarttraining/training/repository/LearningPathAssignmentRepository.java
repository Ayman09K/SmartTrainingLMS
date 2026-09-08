package com.smarttraining.training.repository;

import com.smarttraining.training.entity.LearningPathAssignment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LearningPathAssignmentRepository
        extends JpaRepository<LearningPathAssignment, Long> {

    boolean existsByPathIdAndLearnerId(Long pathId, Long learnerId);

    Optional<LearningPathAssignment> findByPathIdAndLearnerId(
            Long pathId,
            Long learnerId
    );

    List<LearningPathAssignment> findByPathIdOrderByAssignedAtAscIdAsc(
            Long pathId
    );

    List<LearningPathAssignment> findByLearnerIdOrderByAssignedAtDesc(
            Long learnerId
    );

    @Modifying
    @Query("""
            delete from LearningPathAssignment a
            where a.pathId = :pathId
            """)
    int deleteByPathId(@Param("pathId") Long pathId);
}