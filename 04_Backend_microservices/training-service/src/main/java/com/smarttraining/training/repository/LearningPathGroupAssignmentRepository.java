package com.smarttraining.training.repository;

import com.smarttraining.training.entity.LearningPathGroupAssignment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LearningPathGroupAssignmentRepository
        extends JpaRepository<LearningPathGroupAssignment, Long> {

    Optional<LearningPathGroupAssignment> findByPathIdAndGroupId(
            Long pathId,
            Long groupId
    );

    List<LearningPathGroupAssignment>
            findByPathIdOrderByAssignedAtAscIdAsc(Long pathId);

    @Modifying
    @Query("""
            delete from LearningPathGroupAssignment a
            where a.pathId = :pathId
            """)
    int deleteByPathId(@Param("pathId") Long pathId);
}