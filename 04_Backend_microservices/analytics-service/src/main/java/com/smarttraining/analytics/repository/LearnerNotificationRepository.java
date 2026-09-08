package com.smarttraining.analytics.repository;

import com.smarttraining.analytics.entity.LearnerNotification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerNotificationRepository
        extends JpaRepository<LearnerNotification, Long> {

    List<LearnerNotification> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndReadAtIsNull(Long userId);

    Optional<LearnerNotification> findByEventKey(String eventKey);
}