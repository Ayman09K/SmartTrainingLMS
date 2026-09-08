package com.smarttraining.training.repository;

import com.smarttraining.training.entity.TrainingModule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrainingModuleRepository extends JpaRepository<TrainingModule, Long> {

    List<TrainingModule> findByTrainingIdOrderByOrderIndexAsc(Long trainingId);

    @Query("""
            select count(m)
            from TrainingModule m
            join m.training t
            where m.id = :moduleId
              and (t.ownerId = :actorId or t.trainerId = :actorId)
            """)
    long countManageableModule(
            @Param("moduleId") Long moduleId,
            @Param("actorId") Long actorId
    );
}
