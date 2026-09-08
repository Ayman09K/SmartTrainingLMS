package com.smarttraining.training.service;

import com.smarttraining.training.dto.internal.InternalBiScopeResponse;
import com.smarttraining.training.dto.internal.InternalBiScopeResponse.EnrollmentScope;
import com.smarttraining.training.dto.internal.InternalBiScopeResponse.TrainingScope;
import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.repository.EnrollmentRepository;
import com.smarttraining.training.repository.TrainingRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InternalBiScopeService {

    private final TrainingRepository trainingRepository;
    private final EnrollmentRepository enrollmentRepository;

    public InternalBiScopeService(
            TrainingRepository trainingRepository,
            EnrollmentRepository enrollmentRepository
    ) {
        this.trainingRepository = trainingRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    @Transactional(readOnly = true)
    public InternalBiScopeResponse resolve(
            Long actorId,
            String actorRole,
            Long trainingId
    ) {
        if (actorId == null || actorId <= 0) {
            throw new IllegalArgumentException("actorId invalide.");
        }

        String role = normalizeRole(actorRole);

        List<Training> trainings;

        if (trainingId != null) {
            if (trainingId <= 0) {
                throw new IllegalArgumentException(
                        "Identifiant formation invalide."
                );
            }

            Training training =
                    trainingRepository
                            .findById(trainingId)
                            .orElseThrow(
                                () -> new IllegalArgumentException(
                                    "Formation introuvable."
                                )
                            );

            if (!canRead(role, actorId, training)) {
                throw new AccessDeniedException(
                        "Formation hors perimetre BI de cet utilisateur."
                );
            }

            trainings = List.of(training);
        } else {
            trainings =
                    trainingRepository
                            .findAll()
                            .stream()
                            .filter(training ->
                                    canRead(role, actorId, training)
                            )
                            .sorted(
                                Comparator.comparing(
                                    Training::getId
                                )
                            )
                            .toList();
        }

        return new InternalBiScopeResponse(
                actorId,
                role,
                trainings.stream()
                        .map(this::toScope)
                        .toList()
        );
    }

    private TrainingScope toScope(Training training) {
        List<EnrollmentScope> enrollments =
                enrollmentRepository
                        .findByTrainingIdWithTraining(
                                training.getId()
                        )
                        .stream()
                        .sorted(
                            Comparator.comparing(
                                Enrollment::getId
                            )
                        )
                        .map(this::toEnrollment)
                        .toList();

        return new TrainingScope(
                training.getId(),
                training.getTitle(),
                training.getStatus() == null
                        ? null
                        : training.getStatus().name(),
                enrollments
        );
    }

    private EnrollmentScope toEnrollment(
            Enrollment enrollment
    ) {
        return new EnrollmentScope(
                enrollment.getId(),
                enrollment.getLearnerId(),
                enrollment.getStatus() == null
                        ? null
                        : enrollment.getStatus().name(),
                enrollment.getProgressPercentage(),
                enrollment.getEnrolledAt(),
                enrollment.getCompletedAt(),
                enrollment.getDueAt()
        );
    }

    private boolean canRead(
            String role,
            Long actorId,
            Training training
    ) {
        if ("ADMIN".equals(role)) {
            return true;
        }

        return Objects.equals(
                    training.getOwnerId(),
                    actorId
                )
                || Objects.equals(
                    training.getTrainerId(),
                    actorId
                );
    }

    private String normalizeRole(String actorRole) {
        String role = actorRole == null
                ? ""
                : actorRole.trim().toUpperCase(
                    Locale.ROOT
                );

        if (
            !"ADMIN".equals(role)
            && !"FORMATEUR".equals(role)
        ) {
            throw new AccessDeniedException(
                    "BI reserve aux administrateurs et formateurs."
            );
        }

        return role;
    }
}