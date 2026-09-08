package com.smarttraining.training.service;

import com.smarttraining.training.dto.internal.TrainerLearnerAccessResponse;
import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.enums.EnrollmentStatus;
import com.smarttraining.training.repository.EnrollmentRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InternalTrainerLearnerAccessService {

    private final EnrollmentRepository enrollmentRepository;

    public InternalTrainerLearnerAccessService(
            EnrollmentRepository enrollmentRepository
    ) {
        this.enrollmentRepository = enrollmentRepository;
    }

    @Transactional(readOnly = true)
    public TrainerLearnerAccessResponse resolve(
            Long actorId,
            String actorRole,
            Long learnerId
    ) {
        if (actorId == null || actorId <= 0) {
            throw new IllegalArgumentException("actorId invalide.");
        }

        if (learnerId == null || learnerId <= 0) {
            throw new IllegalArgumentException("learnerId invalide.");
        }

        String role = actorRole == null
                ? ""
                : actorRole.trim().toUpperCase(Locale.ROOT);

        List<Enrollment> enrollments;

        if ("ADMIN".equals(role)) {
            enrollments = enrollmentRepository
                    .findByLearnerIdWithTraining(learnerId);
        } else if ("FORMATEUR".equals(role)) {
            enrollments = enrollmentRepository
                    .findManagedByLearnerIdWithTraining(
                            learnerId,
                            actorId
                    );
        } else {
            return new TrainerLearnerAccessResponse(
                    actorId,
                    role,
                    learnerId,
                    false,
                    List.of()
            );
        }

        List<Long> trainingIds = enrollments.stream()
                .filter(enrollment ->
                        enrollment.getStatus() != EnrollmentStatus.CANCELLED
                )
                .map(enrollment -> enrollment.getTraining().getId())
                .filter(id -> id != null && id > 0)
                .distinct()
                .sorted()
                .toList();

        return new TrainerLearnerAccessResponse(
                actorId,
                role,
                learnerId,
                !trainingIds.isEmpty(),
                trainingIds
        );
    }
}