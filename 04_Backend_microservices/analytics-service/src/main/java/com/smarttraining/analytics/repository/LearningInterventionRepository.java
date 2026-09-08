package com.smarttraining.analytics.repository;

import com.smarttraining.analytics.entity.LearningIntervention;
import com.smarttraining.analytics.enums.InterventionStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningInterventionRepository extends JpaRepository<LearningIntervention, Long> {
    List<LearningIntervention> findByLearnerIdOrderByCreatedAtDesc(Long learnerId);
    List<LearningIntervention> findByTrainerIdOrderByCreatedAtDesc(Long trainerId);
    List<LearningIntervention> findByTrainingIdOrderByCreatedAtDesc(Long trainingId);
    List<LearningIntervention> findByStatusOrderByCreatedAtDesc(InterventionStatus status);
    List<LearningIntervention> findByLearnerIdAndTrainingIdOrderByCreatedAtDesc(Long learnerId, Long trainingId);
}
