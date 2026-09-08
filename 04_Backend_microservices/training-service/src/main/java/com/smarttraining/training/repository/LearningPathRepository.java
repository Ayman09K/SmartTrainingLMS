package com.smarttraining.training.repository;

import com.smarttraining.training.entity.LearningPath;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LearningPathRepository
        extends JpaRepository<LearningPath, Long> {

    List<LearningPath> findAllByOrderByCreatedAtDesc();

    List<LearningPath> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    @Query("""
            select p
            from LearningPath p
            where p.id = :rootId
               or p.versionRootId = :rootId
            """)
    List<LearningPath> findVersionFamily(
            @Param("rootId") Long rootId
    );

    boolean existsByPreviousVersionId(Long previousVersionId);

    @Query("""
            select count(p)
            from LearningPath p
            where p.id = :pathId
              and p.ownerId = :actorId
            """)
    long countManageablePath(
            @Param("pathId") Long pathId,
            @Param("actorId") Long actorId
    );
}
