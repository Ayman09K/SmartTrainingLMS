package com.smarttraining.training.repository;

import com.smarttraining.training.entity.Lesson;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LessonRepository extends JpaRepository<Lesson, Long> {

    List<Lesson> findByModuleIdOrderByOrderIndexAsc(Long moduleId);

    @Query("""
            select count(l)
            from Lesson l
            join l.module m
            join m.training t
            where l.id = :lessonId
              and (t.ownerId = :actorId or t.trainerId = :actorId)
            """)
    long countManageableLesson(
            @Param("lessonId") Long lessonId,
            @Param("actorId") Long actorId
    );

    @Query("""
            select count(l)
            from Lesson l
            join l.module m
            where m.training.id = :trainingId
            """)
    long countByTrainingId(@Param("trainingId") Long trainingId);
}
