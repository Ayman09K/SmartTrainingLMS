package com.smarttraining.training.service;

import com.smarttraining.training.dto.internal.ProgressProjectionRequest;
import com.smarttraining.training.dto.internal.ProgressProjectionResponse;
import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.enums.EnrollmentStatus;
import com.smarttraining.training.repository.EnrollmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InternalProgressProjectionService {

    private final EnrollmentRepository enrollmentRepository;

    public InternalProgressProjectionService(EnrollmentRepository enrollmentRepository) {
        this.enrollmentRepository = enrollmentRepository;
    }

    @Transactional
    public ProgressProjectionResponse apply(ProgressProjectionRequest request) {
        Enrollment enrollment = enrollmentRepository
                .findByLearnerIdAndTrainingId(request.getLearnerId(), request.getTrainingId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Inscription introuvable pour la projection de progression."
                ));

        if (enrollment.getStatus() == EnrollmentStatus.CANCELLED) {
            return new ProgressProjectionResponse(enrollment, false);
        }

        double percentage = request.getProgressPercentage().doubleValue();
        enrollment.setProgressPercentage(percentage);

        if ("COMPLETED".equals(request.getStatus()) && percentage >= 100.0) {
            enrollment.setStatus(EnrollmentStatus.COMPLETED);
            enrollment.setCompletedAt(
                    request.getCompletedAt() == null
                            ? java.time.LocalDateTime.now()
                            : request.getCompletedAt()
            );
        } else {
            enrollment.setStatus(EnrollmentStatus.ACTIVE);
            enrollment.setCompletedAt(null);
        }

        return new ProgressProjectionResponse(enrollmentRepository.save(enrollment), true);
    }
}