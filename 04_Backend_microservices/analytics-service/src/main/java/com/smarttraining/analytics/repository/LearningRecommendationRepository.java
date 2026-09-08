package com.smarttraining.analytics.repository;

import com.smarttraining.analytics.entity.LearningRecommendation;
import com.smarttraining.analytics.enums.RecommendationStatus;
import com.smarttraining.analytics.enums.RecommendationType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningRecommendationRepository extends JpaRepository<LearningRecommendation, Long> {
    List<LearningRecommendation> findByLearnerIdOrderByCreatedAtDesc(Long learnerId);
    List<LearningRecommendation> findByTrainingIdOrderByCreatedAtDesc(Long trainingId);
    List<LearningRecommendation> findByStatusOrderByCreatedAtDesc(RecommendationStatus status);
    List<LearningRecommendation> findByLearnerIdAndTrainingIdOrderByCreatedAtDesc(Long learnerId, Long trainingId);
    Optional<LearningRecommendation> findByLearnerIdAndTrainingIdAndRecommendationTypeAndStatus(
            Long learnerId, Long trainingId, RecommendationType recommendationType,
            RecommendationStatus status);
    boolean existsByLearnerIdAndTrainingIdAndRecommendationTypeAndStatus(
            Long learnerId, Long trainingId, RecommendationType recommendationType,
            RecommendationStatus status);
}
