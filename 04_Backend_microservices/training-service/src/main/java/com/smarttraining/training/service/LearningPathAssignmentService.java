package com.smarttraining.training.service;

import com.smarttraining.training.client.AuthDirectoryInternalClient;
import com.smarttraining.training.client.InternalLearnerDirectoryEntry;
import com.smarttraining.training.dto.EnrollmentResponse;
import com.smarttraining.training.dto.LearnerGroupMemberResponse;
import com.smarttraining.training.dto.LearnerGroupTrainingAssignmentRequest;
import com.smarttraining.training.dto.LearnerGroupTrainingAssignmentResponse;
import com.smarttraining.training.dto.LearningPathAssignmentRecordResponse;
import com.smarttraining.training.dto.LearningPathAssignmentResult;
import com.smarttraining.training.dto.LearningPathGroupAssignmentRecordResponse;
import com.smarttraining.training.dto.LearningPathGroupAssignmentRequest;
import com.smarttraining.training.dto.LearningPathLearnerAssignmentRequest;
import com.smarttraining.training.dto.TrainingAssignmentRequest;
import com.smarttraining.training.entity.LearningPath;
import com.smarttraining.training.entity.LearningPathAssignment;
import com.smarttraining.training.entity.LearningPathGroupAssignment;
import com.smarttraining.training.entity.LearningPathStep;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.enums.LearningPathAssignmentSource;
import com.smarttraining.training.enums.LearningPathStatus;
import com.smarttraining.training.enums.TrainingStatus;
import com.smarttraining.training.repository.EnrollmentRepository;
import com.smarttraining.training.repository.LearningPathAssignmentRepository;
import com.smarttraining.training.repository.LearningPathGroupAssignmentRepository;
import com.smarttraining.training.repository.LearningPathRepository;
import com.smarttraining.training.repository.LearningPathStepRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.LearningPathOwnershipService;
import com.smarttraining.training.security.TrainingOwnershipService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningPathAssignmentService {

    private final LearningPathRepository pathRepository;
    private final LearningPathStepRepository stepRepository;
    private final LearningPathAssignmentRepository assignmentRepository;
    private final LearningPathGroupAssignmentRepository groupAssignmentRepository;
    private final TrainingRepository trainingRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentAccessService enrollmentAccessService;
    private final LearnerGroupService learnerGroupService;
    private final LearningPathOwnershipService pathOwnershipService;
    private final LearningPathVersionService pathVersionService;
    private final TrainingOwnershipService trainingOwnershipService;
    private final AuthDirectoryInternalClient authDirectoryClient;

    public LearningPathAssignmentService(
            LearningPathRepository pathRepository,
            LearningPathStepRepository stepRepository,
            LearningPathAssignmentRepository assignmentRepository,
            LearningPathGroupAssignmentRepository groupAssignmentRepository,
            TrainingRepository trainingRepository,
            EnrollmentRepository enrollmentRepository,
            EnrollmentAccessService enrollmentAccessService,
            LearnerGroupService learnerGroupService,
            LearningPathOwnershipService pathOwnershipService,
            LearningPathVersionService pathVersionService,
            TrainingOwnershipService trainingOwnershipService,
            AuthDirectoryInternalClient authDirectoryClient
    ) {
        this.pathRepository = pathRepository;
        this.stepRepository = stepRepository;
        this.assignmentRepository = assignmentRepository;
        this.groupAssignmentRepository = groupAssignmentRepository;
        this.trainingRepository = trainingRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.enrollmentAccessService = enrollmentAccessService;
        this.learnerGroupService = learnerGroupService;
        this.pathOwnershipService = pathOwnershipService;
        this.pathVersionService = pathVersionService;
        this.trainingOwnershipService = trainingOwnershipService;
        this.authDirectoryClient = authDirectoryClient;
    }

    @Transactional
    public LearningPathAssignmentResult assignLearners(
            Long pathId,
            LearningPathLearnerAssignmentRequest request
    ) {
        PathContext context = requirePublishedContext(pathId);

        List<Long> learnerIds = request.getLearnerIds()
                .stream()
                .distinct()
                .toList();

        validateLearners(learnerIds);

        int createdAssignments = createMissingPathAssignments(
                context.path().getId(),
                learnerIds,
                LearningPathAssignmentSource.DIRECT,
                null,
                request.getDueAt()
        );

        List<EnrollmentResponse> newEnrollments =
                new ArrayList<>();

        int alreadyEnrolled = 0;

        for (Training training : context.trainings()) {
            List<Long> toEnroll = learnerIds.stream()
                    .filter(learnerId ->
                            !enrollmentRepository
                                    .existsByLearnerIdAndTrainingId(
                                            learnerId,
                                            training.getId()
                                    )
                    )
                    .toList();

            alreadyEnrolled += learnerIds.size() - toEnroll.size();

            if (toEnroll.isEmpty()) {
                continue;
            }

            TrainingAssignmentRequest assignmentRequest =
                    new TrainingAssignmentRequest();

            assignmentRequest.setTrainingId(training.getId());
            assignmentRequest.setLearnerIds(toEnroll);
            assignmentRequest.setDueAt(request.getDueAt());

            List<EnrollmentResponse> assigned =
                    enrollmentAccessService.assignLearners(
                            assignmentRequest
                    );

            if (assigned.size() != toEnroll.size()) {
                throw new IllegalStateException(
                        "Affectation parcours incomplete pour une formation"
                );
            }

            newEnrollments.addAll(assigned);
        }

        return new LearningPathAssignmentResult(
                context.path().getId(),
                null,
                learnerIds.size(),
                createdAssignments,
                learnerIds.size() - createdAssignments,
                context.steps().size(),
                newEnrollments.size(),
                alreadyEnrolled,
                newEnrollments
        );
    }

    @Transactional
    public LearningPathAssignmentResult assignGroup(
            Long pathId,
            Long groupId,
            LearningPathGroupAssignmentRequest request
    ) {
        PathContext context = requirePublishedContext(pathId);

        List<LearnerGroupMemberResponse> members =
                learnerGroupService.getMembers(groupId);

        List<Long> learnerIds = members.stream()
                .map(LearnerGroupMemberResponse::getLearnerId)
                .distinct()
                .toList();

        LearningPathGroupAssignment groupAssignment =
                groupAssignmentRepository
                        .findByPathIdAndGroupId(pathId, groupId)
                        .orElseGet(() -> {
                            LearningPathGroupAssignment created =
                                    new LearningPathGroupAssignment();
                            created.setPathId(pathId);
                            created.setGroupId(groupId);
                            created.setAssignedBy(
                                    pathOwnershipService.getActorId()
                            );
                            created.setDueAt(request.getDueAt());
                            return groupAssignmentRepository.save(created);
                        });

        if (groupAssignment.getId() == null) {
            throw new IllegalStateException(
                    "Affectation groupe du parcours non persistante"
            );
        }

        int createdAssignments = createMissingPathAssignments(
                pathId,
                learnerIds,
                LearningPathAssignmentSource.GROUP,
                groupId,
                request.getDueAt()
        );

        List<EnrollmentResponse> newEnrollments =
                new ArrayList<>();

        int alreadyEnrolled = 0;

        for (Training training : context.trainings()) {
            LearnerGroupTrainingAssignmentRequest assignmentRequest =
                    new LearnerGroupTrainingAssignmentRequest();

            assignmentRequest.setTrainingId(training.getId());
            assignmentRequest.setDueAt(request.getDueAt());

            LearnerGroupTrainingAssignmentResponse result =
                    learnerGroupService.assignTrainingToGroup(
                            groupId,
                            assignmentRequest
                    );

            newEnrollments.addAll(
                    result.getAssignedEnrollments()
            );

            alreadyEnrolled += result.getAlreadyEnrolled();
        }

        return new LearningPathAssignmentResult(
                pathId,
                groupId,
                learnerIds.size(),
                createdAssignments,
                learnerIds.size() - createdAssignments,
                context.steps().size(),
                newEnrollments.size(),
                alreadyEnrolled,
                newEnrollments
        );
    }

    @Transactional(readOnly = true)
    public List<LearningPathAssignmentRecordResponse>
            getLearnerAssignments(Long pathId) {
        LearningPath path = findManageablePath(pathId);

        return assignmentRepository
                .findByPathIdOrderByAssignedAtAscIdAsc(path.getId())
                .stream()
                .map(LearningPathAssignmentRecordResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LearningPathGroupAssignmentRecordResponse>
            getGroupAssignments(Long pathId) {
        LearningPath path = findManageablePath(pathId);

        return groupAssignmentRepository
                .findByPathIdOrderByAssignedAtAscIdAsc(path.getId())
                .stream()
                .map(LearningPathGroupAssignmentRecordResponse::new)
                .toList();
    }

    private int createMissingPathAssignments(
            Long pathId,
            List<Long> learnerIds,
            LearningPathAssignmentSource source,
            Long groupId,
            LocalDateTime dueAt
    ) {
        int created = 0;
        Long actorId = pathOwnershipService.getActorId();

        for (Long learnerId : learnerIds) {
            if (assignmentRepository.existsByPathIdAndLearnerId(
                    pathId,
                    learnerId
            )) {
                continue;
            }

            LearningPathAssignment assignment =
                    new LearningPathAssignment();

            assignment.setPathId(pathId);
            assignment.setLearnerId(learnerId);
            assignment.setSource(source);
            assignment.setGroupId(groupId);
            assignment.setAssignedBy(actorId);
            assignment.setDueAt(dueAt);

            assignmentRepository.save(assignment);
            created++;
        }

        assignmentRepository.flush();
        return created;
    }

    private void validateLearners(List<Long> learnerIds) {
        List<InternalLearnerDirectoryEntry> identities =
                authDirectoryClient.resolveLearners(learnerIds);

        Set<Long> resolved = new HashSet<>();

        for (InternalLearnerDirectoryEntry identity : identities) {
            if (identity != null && identity.getLearnerId() != null) {
                resolved.add(identity.getLearnerId());
            }
        }

        if (resolved.size() != learnerIds.size()) {
            throw new IllegalArgumentException(
                    "Un ou plusieurs apprenants sont introuvables"
            );
        }
    }

    private PathContext requirePublishedContext(Long pathId) {
        LearningPath path = findManageablePath(pathId);

        if (path.getStatus() != LearningPathStatus.PUBLISHED) {
            throw new IllegalArgumentException(
                    "Seul un parcours publie peut etre affecte"
            );
        }

        if (!pathVersionService.isLatestPublishedVersion(path)) {
            throw new IllegalArgumentException(
                    "Une version plus recente de ce parcours est publiee. "
                            + "Affectez la version la plus recente"
            );
        }

        List<LearningPathStep> steps =
                stepRepository.findByPathIdOrderByPositionAscIdAsc(pathId);

        if (steps.isEmpty()) {
            throw new IllegalArgumentException(
                    "Le parcours ne contient aucune formation"
            );
        }

        List<Training> trainings = new ArrayList<>();

        for (LearningPathStep step : steps) {
            Training training = trainingRepository
                    .findById(step.getTrainingId())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Une formation du parcours est introuvable"
                            )
                    );

            trainingOwnershipService.assertCanManageTraining(training);

            TrainingStatus status = training.getStatus() == null
                    ? TrainingStatus.DRAFT
                    : training.getStatus().normalized();

            if (status != TrainingStatus.PUBLISHED) {
                throw new IllegalArgumentException(
                        "Toutes les formations du parcours doivent rester publiees"
                );
            }

            trainings.add(training);
        }

        return new PathContext(path, steps, trainings);
    }

    private LearningPath findManageablePath(Long pathId) {
        LearningPath path = pathRepository.findById(pathId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Parcours introuvable")
                );

        pathOwnershipService.assertCanManagePath(path);
        return path;
    }

    private record PathContext(
            LearningPath path,
            List<LearningPathStep> steps,
            List<Training> trainings
    ) {
    }
}
