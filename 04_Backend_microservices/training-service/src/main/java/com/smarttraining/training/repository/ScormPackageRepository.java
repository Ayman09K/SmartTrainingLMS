package com.smarttraining.training.repository;

import com.smarttraining.training.entity.ScormPackage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScormPackageRepository extends JpaRepository<ScormPackage, Long> {

    List<ScormPackage> findByLessonIdOrderByUploadedAtDesc(Long lessonId);
}
