package com.smarttraining.analytics.repository;

import com.smarttraining.analytics.entity.Feedback;
import com.smarttraining.analytics.enums.FeedbackStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    List<Feedback> findByLearnerIdOrderByCreatedAtDesc(Long learnerId);

    List<Feedback> findByTrainingIdOrderByCreatedAtDesc(Long trainingId);

    List<Feedback> findByLearnerIdAndTrainingIdOrderByCreatedAtDesc(Long learnerId, Long trainingId);

    List<Feedback> findByStatusOrderByCreatedAtDesc(FeedbackStatus status);

    long countByLearnerId(Long learnerId);

    long countByLearnerIdAndTrainingId(Long learnerId, Long trainingId);
}
