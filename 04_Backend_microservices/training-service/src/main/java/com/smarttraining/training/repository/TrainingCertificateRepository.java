package com.smarttraining.training.repository;

import com.smarttraining.training.entity.TrainingCertificate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingCertificateRepository
        extends JpaRepository<TrainingCertificate, Long> {

    Optional<TrainingCertificate> findByPublicCode(String publicCode);

    Optional<TrainingCertificate> findByLearnerIdAndTrainingId(
            Long learnerId,
            Long trainingId
    );

    Optional<TrainingCertificate> findByIdAndLearnerId(
            Long id,
            Long learnerId
    );

    List<TrainingCertificate> findByLearnerIdOrderByIssuedAtDesc(
            Long learnerId
    );

    boolean existsByPublicCode(String publicCode);
}