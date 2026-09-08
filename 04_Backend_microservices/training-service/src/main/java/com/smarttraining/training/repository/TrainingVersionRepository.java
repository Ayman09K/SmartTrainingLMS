package com.smarttraining.training.repository;

import com.smarttraining.training.entity.TrainingVersion;
import com.smarttraining.training.enums.TrainingVersionStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingVersionRepository extends JpaRepository<TrainingVersion, Long> {

    List<TrainingVersion> findByTraining_IdOrderByVersionNumberDesc(Long trainingId);

    List<TrainingVersion> findByTraining_IdAndStatus(
            Long trainingId,
            TrainingVersionStatus status
    );

    Optional<TrainingVersion> findByTraining_IdAndVersionNumber(
            Long trainingId,
            Integer versionNumber
    );

    Optional<TrainingVersion> findFirstByTraining_IdOrderByVersionNumberDesc(Long trainingId);
}
