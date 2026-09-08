package com.smarttraining.analytics.repository;

import com.smarttraining.analytics.entity.LearningAlert;
import com.smarttraining.analytics.enums.AlertStatus;
import com.smarttraining.analytics.enums.AlertType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningAlertRepository extends JpaRepository<LearningAlert, Long> {
    List<LearningAlert> findByLearnerIdOrderByCreatedAtDesc(Long learnerId);
    List<LearningAlert> findByTrainingIdOrderByCreatedAtDesc(Long trainingId);
    List<LearningAlert> findByStatusOrderByCreatedAtDesc(AlertStatus status);
    List<LearningAlert> findByLearnerIdAndTrainingIdOrderByCreatedAtDesc(Long learnerId, Long trainingId);
    Optional<LearningAlert> findByLearnerIdAndTrainingIdAndAlertTypeAndStatus(
            Long learnerId, Long trainingId, AlertType alertType, AlertStatus status);
    boolean existsByLearnerIdAndTrainingIdAndAlertTypeAndStatus(
            Long learnerId, Long trainingId, AlertType alertType, AlertStatus status);
}
