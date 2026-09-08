package com.smarttraining.training.repository;

import com.smarttraining.training.entity.ScormRuntimeValue;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScormRuntimeValueRepository extends JpaRepository<ScormRuntimeValue, Long> {

    List<ScormRuntimeValue> findByAttemptIdOrderByIdAsc(Long attemptId);

    Optional<ScormRuntimeValue> findByAttemptIdAndElementKey(
        Long attemptId,
        String elementKey
    );
}