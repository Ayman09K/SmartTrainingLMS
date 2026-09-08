package com.smarttraining.training.repository;

import com.smarttraining.training.entity.ScormLaunchSession;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScormLaunchSessionRepository extends JpaRepository<ScormLaunchSession, Long> {
    Optional<ScormLaunchSession> findByPublicId(String publicId);
}