package com.smarttraining.training.repository;

import com.smarttraining.training.entity.ScormAttempt;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScormAttemptRepository extends JpaRepository<ScormAttempt, Long> {

    Optional<ScormAttempt> findFirstByLearnerIdAndResourceIdOrderByAttemptNumberDesc(
        Long learnerId,
        Long resourceId
    );

    long countByLearnerIdAndResourceId(Long learnerId, Long resourceId);
}