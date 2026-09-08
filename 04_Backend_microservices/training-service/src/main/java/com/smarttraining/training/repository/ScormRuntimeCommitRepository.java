package com.smarttraining.training.repository;

import com.smarttraining.training.entity.ScormRuntimeCommit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScormRuntimeCommitRepository extends JpaRepository<ScormRuntimeCommit, Long> {
    boolean existsByClientCommitId(String clientCommitId);
}