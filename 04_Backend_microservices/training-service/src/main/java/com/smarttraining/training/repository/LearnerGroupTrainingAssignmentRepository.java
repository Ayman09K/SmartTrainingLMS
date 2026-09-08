package com.smarttraining.training.repository;

import com.smarttraining.training.entity.LearnerGroupTrainingAssignment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerGroupTrainingAssignmentRepository
        extends JpaRepository<LearnerGroupTrainingAssignment, Long> {

    Optional<LearnerGroupTrainingAssignment> findByGroupIdAndTrainingId(
            Long groupId,
            Long trainingId
    );

    List<LearnerGroupTrainingAssignment>
            findByGroupIdOrderByAssignedAtAscIdAsc(Long groupId);

    void deleteByGroupId(Long groupId);
}