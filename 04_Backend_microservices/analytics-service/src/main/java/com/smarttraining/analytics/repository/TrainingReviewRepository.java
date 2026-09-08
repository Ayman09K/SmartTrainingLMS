package com.smarttraining.analytics.repository;

import com.smarttraining.analytics.entity.TrainingReview;
import com.smarttraining.analytics.enums.ReviewStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingReviewRepository extends JpaRepository<TrainingReview, Long> {

    Optional<TrainingReview> findByLearnerIdAndTrainingId(Long learnerId, Long trainingId);

    List<TrainingReview> findByLearnerIdOrderByCreatedAtDesc(Long learnerId);

    List<TrainingReview> findByTrainingIdOrderByCreatedAtDesc(Long trainingId);

    List<TrainingReview> findByTrainingIdAndStatusOrderByCreatedAtDesc(
            Long trainingId,
            ReviewStatus status
    );

    long countByLearnerId(Long learnerId);

    long countByLearnerIdAndTrainingId(Long learnerId, Long trainingId);
}
