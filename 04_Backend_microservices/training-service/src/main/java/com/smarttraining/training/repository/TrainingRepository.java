package com.smarttraining.training.repository;

import com.smarttraining.training.entity.Training;
import com.smarttraining.training.enums.TrainingStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrainingRepository extends JpaRepository<Training, Long> {

    List<Training> findByTrainerId(Long trainerId);

    List<Training> findByStatus(TrainingStatus status);

    List<Training> findByStatusAndVisibilityIn(
            TrainingStatus status,
            List<TrainingVisibility> visibility
    );

    List<Training> findByCategoryIgnoreCase(String category);

    List<Training> findByCategoryRef_Id(Long categoryId);

    List<Training> findByTitleContainingIgnoreCase(String keyword);

    @Query("""
            select count(t)
            from Training t
            where t.id = :trainingId
              and (t.ownerId = :actorId or t.trainerId = :actorId)
            """)
    long countManageableTraining(
            @Param("trainingId") Long trainingId,
            @Param("actorId") Long actorId
    );
}
