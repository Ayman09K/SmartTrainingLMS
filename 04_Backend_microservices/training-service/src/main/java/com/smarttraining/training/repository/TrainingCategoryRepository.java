package com.smarttraining.training.repository;

import com.smarttraining.training.entity.TrainingCategory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingCategoryRepository
        extends JpaRepository<TrainingCategory, Long> {

    Optional<TrainingCategory> findByNameIgnoreCase(String name);

    List<TrainingCategory> findByActiveTrueOrderBySortOrderAscNameAsc();

    List<TrainingCategory> findAllByOrderBySortOrderAscNameAsc();
}