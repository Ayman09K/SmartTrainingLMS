package com.smarttraining.training.repository;

import com.smarttraining.training.entity.ScormObjective;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScormObjectiveRepository extends JpaRepository<ScormObjective, Long> {

    List<ScormObjective> findByAttemptIdOrderByObjectiveIndexAsc(Long attemptId);

    Optional<ScormObjective> findByAttemptIdAndObjectiveIndex(
        Long attemptId,
        Integer objectiveIndex
    );

    void deleteByAttemptId(Long attemptId);
}