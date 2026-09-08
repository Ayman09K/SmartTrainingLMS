package com.smarttraining.analytics.repository;

import com.smarttraining.analytics.entity.LearningEvent;
import com.smarttraining.analytics.enums.LearningEventType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningEventRepository extends JpaRepository<LearningEvent, Long> {

    Optional<LearningEvent> findByIdempotencyKey(String idempotencyKey);

    List<LearningEvent> findByLearnerIdOrderByEventDateDesc(Long learnerId);

    List<LearningEvent> findByTrainingIdOrderByEventDateDesc(Long trainingId);

    List<LearningEvent> findByLearnerIdAndTrainingIdOrderByEventDateDesc(
        Long learnerId,
        Long trainingId
    );

    List<LearningEvent> findByLearnerIdAndTrainingIdOrderByEventDateAsc(
        Long learnerId,
        Long trainingId
    );

    List<LearningEvent> findByLearnerIdAndEventTypeOrderByEventDateDesc(
        Long learnerId,
        LearningEventType eventType
    );

    List<LearningEvent> findByTrainingIdAndEventDateGreaterThanEqualAndEventDateLessThanOrderByEventDateDesc(
        Long trainingId,
        LocalDateTime from,
        LocalDateTime toExclusive
    );
    long countByLearnerIdAndTrainingId(Long learnerId, Long trainingId);
}