package com.smarttraining.training.repository;

import com.smarttraining.training.entity.LearnerGroup;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerGroupRepository
        extends JpaRepository<LearnerGroup, Long> {

    List<LearnerGroup> findAllByOrderByNameAsc();

    List<LearnerGroup> findByOwnerIdOrderByNameAsc(Long ownerId);

    boolean existsByOwnerIdAndNameIgnoreCase(
            Long ownerId,
            String name
    );

    boolean existsByOwnerIdAndNameIgnoreCaseAndIdNot(
            Long ownerId,
            String name,
            Long id
    );
}
