package com.smarttraining.training.repository;

import com.smarttraining.training.entity.LearningPathStep;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LearningPathStepRepository
        extends JpaRepository<LearningPathStep, Long> {

    List<LearningPathStep> findByPathIdOrderByPositionAscIdAsc(Long pathId);

    Optional<LearningPathStep> findByIdAndPathId(Long id, Long pathId);

    boolean existsByPathIdAndTrainingId(Long pathId, Long trainingId);

    @Query("""
            select coalesce(max(s.position), 0)
            from LearningPathStep s
            where s.pathId = :pathId
            """)
    Integer findMaxPositionByPathId(@Param("pathId") Long pathId);

    @Modifying
    @Query("""
            delete from LearningPathStep s
            where s.pathId = :pathId
            """)
    int deleteByPathId(@Param("pathId") Long pathId);
}