package com.smarttraining.training.repository;

import com.smarttraining.training.entity.TrainingDeletionOutbox;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingDeletionOutboxRepository
        extends JpaRepository<TrainingDeletionOutbox, Long> {

    List<TrainingDeletionOutbox>
            findTop20ByCompletedFalseOrderByIdAsc();
}