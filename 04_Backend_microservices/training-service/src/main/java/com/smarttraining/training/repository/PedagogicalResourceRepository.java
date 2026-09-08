package com.smarttraining.training.repository;

import com.smarttraining.training.entity.PedagogicalResource;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PedagogicalResourceRepository extends JpaRepository<PedagogicalResource, Long> {

    List<PedagogicalResource> findByLessonIdOrderByOrderIndexAsc(Long lessonId);

    long countByLessonId(Long lessonId);

    @Query("""
            select count(r)
            from PedagogicalResource r
            join r.lesson l
            join l.module m
            join m.training t
            where r.id = :resourceId
              and (t.ownerId = :actorId or t.trainerId = :actorId)
            """)
    long countManageableResource(
            @Param("resourceId") Long resourceId,
            @Param("actorId") Long actorId
    );
}
