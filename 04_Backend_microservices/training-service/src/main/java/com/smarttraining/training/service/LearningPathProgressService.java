package com.smarttraining.training.service;

import com.smarttraining.training.dto.LearningPathProgressResponse;
import com.smarttraining.training.dto.LearningPathTrainingProgressResponse;
import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.entity.LearningPath;
import com.smarttraining.training.entity.LearningPathAssignment;
import com.smarttraining.training.entity.LearningPathStep;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.repository.EnrollmentRepository;
import com.smarttraining.training.repository.LearningPathAssignmentRepository;
import com.smarttraining.training.repository.LearningPathRepository;
import com.smarttraining.training.repository.LearningPathStepRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.AuthenticatedUserService;
import com.smarttraining.training.security.LearningPathOwnershipService;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningPathProgressService {

    private final LearningPathRepository pathRepository;
    private final LearningPathStepRepository stepRepository;
    private final LearningPathAssignmentRepository assignmentRepository;
    private final TrainingRepository trainingRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LearningPathOwnershipService pathOwnershipService;
    private final AuthenticatedUserService authenticatedUserService;

    public LearningPathProgressService(
            LearningPathRepository pathRepository,
            LearningPathStepRepository stepRepository,
            LearningPathAssignmentRepository assignmentRepository,
            TrainingRepository trainingRepository,
            EnrollmentRepository enrollmentRepository,
            LearningPathOwnershipService pathOwnershipService,
            AuthenticatedUserService authenticatedUserService
    ) {
        this.pathRepository = pathRepository;
        this.stepRepository = stepRepository;
        this.assignmentRepository = assignmentRepository;
        this.trainingRepository = trainingRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.pathOwnershipService = pathOwnershipService;
        this.authenticatedUserService = authenticatedUserService;
    }

    @Transactional(readOnly = true)
    public List<LearningPathProgressResponse> getMyAssignedPaths() {
        Long learnerId = requireLearnerIdentity();

        return assignmentRepository
                .findByLearnerIdOrderByAssignedAtDesc(learnerId)
                .stream()
                .map(assignment ->
                        buildProgress(
                                assignment.getPathId(),
                                learnerId,
                                assignment
                        )
                )
                .toList();
    }

    @Transactional(readOnly = true)
    public LearningPathProgressResponse getMyPathProgress(Long pathId) {
        Long learnerId = requireLearnerIdentity();

        LearningPathAssignment assignment = assignmentRepository
                .findByPathIdAndLearnerId(pathId, learnerId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Ce parcours n'est pas affecte a cet utilisateur"
                        )
                );

        return buildProgress(pathId, learnerId, assignment);
    }

    @Transactional(readOnly = true)
    public List<LearningPathProgressResponse> getManagedLearnerProgress(
            Long pathId
    ) {
        LearningPath path = findManageablePath(pathId);

        return assignmentRepository
                .findByPathIdOrderByAssignedAtAscIdAsc(path.getId())
                .stream()
                .map(assignment ->
                        buildProgress(
                                path.getId(),
                                assignment.getLearnerId(),
                                assignment
                        )
                )
                .toList();
    }

    @Transactional(readOnly = true)
    public LearningPathProgressResponse getManagedLearnerProgress(
            Long pathId,
            Long learnerId
    ) {
        LearningPath path = findManageablePath(pathId);

        LearningPathAssignment assignment = assignmentRepository
                .findByPathIdAndLearnerId(path.getId(), learnerId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Cet apprenant n'est pas affecte a ce parcours"
                        )
                );

        return buildProgress(path.getId(), learnerId, assignment);
    }

    private LearningPathProgressResponse buildProgress(
            Long pathId,
            Long learnerId,
            LearningPathAssignment assignment
    ) {
        LearningPath path = pathRepository.findById(pathId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Parcours introuvable"
                        )
                );

        List<LearningPathStep> steps =
                stepRepository.findByPathIdOrderByPositionAscIdAsc(pathId);

        List<LearningPathTrainingProgressResponse> stepProgress =
                new ArrayList<>();

        int totalSteps = steps.size();
        int requiredSteps = 0;
        int enrolledSteps = 0;
        int completedSteps = 0;
        int completedRequiredSteps = 0;

        double allProgressSum = 0.0;
        double requiredProgressSum = 0.0;

        LearningPathTrainingProgressResponse nextRequired = null;
        LearningPathTrainingProgressResponse nextAny = null;

        for (LearningPathStep step : steps) {
            if (Boolean.TRUE.equals(step.getRequired())) {
                requiredSteps++;
            }

            Optional<Training> trainingOptional =
                    trainingRepository.findById(step.getTrainingId());

            Training training = trainingOptional.orElse(null);
            boolean trainingMissing = training == null;

            Optional<Enrollment> enrollmentOptional =
                    trainingMissing
                            ? Optional.empty()
                            : enrollmentRepository
                                    .findByLearnerIdAndTrainingId(
                                            learnerId,
                                            step.getTrainingId()
                                    );

            Enrollment enrollment = enrollmentOptional.orElse(null);
            boolean enrolled = enrollment != null;

            if (enrolled) {
                enrolledSteps++;
            }

            double progress = enrolled
                    ? clamp(enrollment.getProgressPercentage())
                    : 0.0;

            boolean stepCompleted = progress >= 100.0;

            if (stepCompleted) {
                completedSteps++;

                if (Boolean.TRUE.equals(step.getRequired())) {
                    completedRequiredSteps++;
                }
            }

            allProgressSum += progress;

            if (Boolean.TRUE.equals(step.getRequired())) {
                requiredProgressSum += progress;
            }

            LearningPathTrainingProgressResponse response =
                    new LearningPathTrainingProgressResponse(
                            step.getId(),
                            step.getTrainingId(),
                            training == null ? null : training.getTitle(),
                            step.getPosition(),
                            Boolean.TRUE.equals(step.getRequired()),
                            trainingMissing,
                            enrolled,
                            enrollment == null ? null : enrollment.getId(),
                            enrollment == null ? null : enrollment.getStatus(),
                            progress,
                            enrollment == null
                                    ? null
                                    : enrollment.getCompletedAt(),
                            enrollment == null
                                    ? null
                                    : enrollment.getDueAt()
                    );

            stepProgress.add(response);

            if (
                !trainingMissing
                && progress < 100.0
                && nextAny == null
            ) {
                nextAny = response;
            }

            if (
                Boolean.TRUE.equals(step.getRequired())
                && !trainingMissing
                && progress < 100.0
                && nextRequired == null
            ) {
                nextRequired = response;
            }
        }

        int optionalSteps = totalSteps - requiredSteps;

        double overallProgress = totalSteps == 0
                ? 0.0
                : round2(allProgressSum / totalSteps);

        int completionDenominator = requiredSteps > 0
                ? requiredSteps
                : totalSteps;

        double completionNumerator = requiredSteps > 0
                ? requiredProgressSum
                : allProgressSum;

        double completionProgress = completionDenominator == 0
                ? 0.0
                : round2(
                        completionNumerator / completionDenominator
                );

        boolean completed;

        if (completionDenominator == 0) {
            completed = false;
        }
        else if (requiredSteps > 0) {
            completed = completedRequiredSteps == requiredSteps;
        }
        else {
            completed = completedSteps == totalSteps;
        }

        LearningPathTrainingProgressResponse next =
                nextRequired != null
                        ? nextRequired
                        : nextAny;

        return new LearningPathProgressResponse(
                path.getId(),
                path.getTitle(),
                path.getStatus(),
                learnerId,
                assignment.getSource(),
                assignment.getGroupId(),
                assignment.getAssignedAt(),
                assignment.getDueAt(),
                totalSteps,
                requiredSteps,
                optionalSteps,
                enrolledSteps,
                completedSteps,
                completedRequiredSteps,
                overallProgress,
                completionProgress,
                completed,
                next == null ? null : next.getStepId(),
                next == null ? null : next.getTrainingId(),
                next == null ? null : next.getPosition(),
                stepProgress
        );
    }

    private Long requireLearnerIdentity() {
        String role = authenticatedUserService.getRole();

        if (
            !"APPRENANT".equals(role)
            && !"FORMATEUR".equals(role)
            && !"ADMIN".equals(role)
        ) {
            throw new AccessDeniedException(
                    "Identite utilisateur non autorisee"
            );
        }

        return authenticatedUserService.getUserId();
    }

    private LearningPath findManageablePath(Long pathId) {
        LearningPath path = pathRepository.findById(pathId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Parcours introuvable"
                        )
                );

        pathOwnershipService.assertCanManagePath(path);
        return path;
    }

    private double clamp(Double value) {
        if (value == null) {
            return 0.0;
        }

        if (value < 0.0) {
            return 0.0;
        }

        if (value > 100.0) {
            return 100.0;
        }

        return value;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}