package com.smarttraining.analytics.repository;

import com.smarttraining.analytics.entity.LearnerProgress;
import com.smarttraining.analytics.enums.ProgressStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerProgressRepository extends JpaRepository<LearnerProgress, Long> {
    Optional<LearnerProgress> findByLearnerIdAndTrainingId(Long learnerId, Long trainingId);
    List<LearnerProgress> findByLearnerId(Long learnerId);
    List<LearnerProgress> findByTrainingId(Long trainingId);
    List<LearnerProgress> findByStatus(ProgressStatus status);
}
