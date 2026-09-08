package com.smarttraining.training.repository;

import com.smarttraining.training.entity.ScormInteraction;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScormInteractionRepository extends JpaRepository<ScormInteraction, Long> {

    List<ScormInteraction> findByAttemptIdOrderByInteractionIndexAsc(Long attemptId);

    Optional<ScormInteraction> findByAttemptIdAndInteractionIndex(
        Long attemptId,
        Integer interactionIndex
    );

    void deleteByAttemptId(Long attemptId);
}