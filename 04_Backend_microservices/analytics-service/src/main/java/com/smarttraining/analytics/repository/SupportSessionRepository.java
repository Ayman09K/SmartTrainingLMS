package com.smarttraining.analytics.repository;

import com.smarttraining.analytics.entity.SupportSession;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportSessionRepository extends JpaRepository<SupportSession, Long> {

    List<SupportSession> findByLearnerIdOrderByScheduledAtDesc(Long learnerId);

    List<SupportSession> findByTrainerIdOrderByScheduledAtDesc(Long trainerId);

    List<SupportSession> findAllByOrderByScheduledAtDesc();
}
