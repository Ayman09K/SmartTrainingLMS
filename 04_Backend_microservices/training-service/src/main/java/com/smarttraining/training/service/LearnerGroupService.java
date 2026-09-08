package com.smarttraining.training.service;

import com.smarttraining.training.client.AuthDirectoryInternalClient;
import com.smarttraining.training.client.InternalLearnerDirectoryEntry;
import com.smarttraining.training.dto.EnrollmentResponse;
import com.smarttraining.training.dto.LearnerGroupMemberAddRequest;
import com.smarttraining.training.dto.LearnerGroupMemberResponse;
import com.smarttraining.training.dto.LearnerGroupRequest;
import com.smarttraining.training.dto.LearnerGroupResponse;
import com.smarttraining.training.dto.LearnerGroupTrainingAssignmentRequest;
import com.smarttraining.training.dto.LearnerGroupTrainingAssignmentResponse;
import com.smarttraining.training.dto.LearnerGroupTrainingAssignmentRecordResponse;
import com.smarttraining.training.dto.TrainingAssignmentRequest;
import com.smarttraining.training.entity.LearnerGroup;
import com.smarttraining.training.entity.LearnerGroupMember;
import com.smarttraining.training.entity.LearnerGroupTrainingAssignment;
import com.smarttraining.training.repository.EnrollmentRepository;
import com.smarttraining.training.repository.LearnerGroupMemberRepository;
import com.smarttraining.training.repository.LearnerGroupRepository;
import com.smarttraining.training.repository.LearnerGroupTrainingAssignmentRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.AuthenticatedUserService;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearnerGroupService {

    private final LearnerGroupRepository groupRepository;
    private final LearnerGroupTrainingAssignmentRepository trainingAssignmentRepository;
    private final TrainingRepository trainingRepository;
    private final LearnerGroupMemberRepository memberRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentAccessService enrollmentAccessService;
    private final AuthenticatedUserService authenticatedUserService;
    private final AuthDirectoryInternalClient directoryClient;

    public LearnerGroupService(
            LearnerGroupRepository groupRepository,
            LearnerGroupTrainingAssignmentRepository trainingAssignmentRepository,
            TrainingRepository trainingRepository,
            LearnerGroupMemberRepository memberRepository,
            EnrollmentRepository enrollmentRepository,
            EnrollmentAccessService enrollmentAccessService,
            AuthenticatedUserService authenticatedUserService,
            AuthDirectoryInternalClient directoryClient
    ) {
        this.groupRepository = groupRepository;
        this.trainingAssignmentRepository = trainingAssignmentRepository;
        this.trainingRepository = trainingRepository;
        this.memberRepository = memberRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.enrollmentAccessService = enrollmentAccessService;
        this.authenticatedUserService = authenticatedUserService;
        this.directoryClient = directoryClient;
    }

    @Transactional(readOnly = true)
    public List<LearnerGroupResponse> getGroups() {
        requireManager();

        List<LearnerGroup> groups =
                isAdmin()
                ? groupRepository.findAllByOrderByNameAsc()
                : groupRepository.findByOwnerIdOrderByNameAsc(
                        actorId()
                );

        return groups.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LearnerGroupResponse getGroup(Long groupId) {
        LearnerGroup group = requireManagedGroup(groupId);
        return toResponse(group);
    }

    @Transactional
    public LearnerGroupResponse createGroup(
            LearnerGroupRequest request
    ) {
        requireManager();

        String name = normalizeName(request.getName());
        String description = normalizeDescription(
                request.getDescription()
        );

        if (groupRepository.existsByOwnerIdAndNameIgnoreCase(
                actorId(),
                name
        )) {
            throw new IllegalArgumentException(
                    "Un groupe portant ce nom existe deja."
            );
        }

        LearnerGroup group = new LearnerGroup(
                name,
                description,
                actorId(),
                actorRole()
        );

        return toResponse(groupRepository.save(group));
    }

    @Transactional
    public LearnerGroupResponse updateGroup(
            Long groupId,
            LearnerGroupRequest request
    ) {
        LearnerGroup group = requireManagedGroup(groupId);

        String name = normalizeName(request.getName());
        String description = normalizeDescription(
                request.getDescription()
        );

        if (groupRepository
                .existsByOwnerIdAndNameIgnoreCaseAndIdNot(
                    group.getOwnerId(),
                    name,
                    group.getId()
                )) {
            throw new IllegalArgumentException(
                    "Un groupe portant ce nom existe deja."
            );
        }

        group.setName(name);
        group.setDescription(description);

        return toResponse(groupRepository.save(group));
    }

    @Transactional
    public void deleteGroup(Long groupId) {
        LearnerGroup group = requireManagedGroup(groupId);

        trainingAssignmentRepository.deleteByGroupId(group.getId());
        memberRepository.deleteByGroup_Id(group.getId());
        groupRepository.delete(group);
    }

    @Transactional(readOnly = true)
    public List<LearnerGroupMemberResponse> getMembers(
            Long groupId
    ) {
        LearnerGroup group = requireManagedGroup(groupId);

        List<LearnerGroupMember> members =
                memberRepository
                        .findByGroup_IdOrderByAddedAtAsc(
                            group.getId()
                        );

        return toMemberResponses(members);
    }

    @Transactional
    public LearnerGroupTrainingAssignmentResponse assignTrainingToGroup(
            Long groupId,
            LearnerGroupTrainingAssignmentRequest request
    ) {
        LearnerGroup group = requireManagedGroup(groupId);

        TrainingAssignmentRequest validationRequest =
                new TrainingAssignmentRequest();

        validationRequest.setTrainingId(request.getTrainingId());
        validationRequest.setLearnerIds(List.of());
        validationRequest.setDueAt(request.getDueAt());

        /*
         * No-op call on the existing assignment engine.
         * It validates:
         * - ADMIN / FORMATEUR role
         * - training existence
         * - training ownership
         * - dueAt
         * It creates no enrollment because learnerIds is empty.
         */
        enrollmentAccessService.assignLearners(validationRequest);

        LearnerGroupTrainingAssignment persistentAssignment =
                trainingAssignmentRepository
                        .findByGroupIdAndTrainingId(
                            group.getId(),
                            request.getTrainingId()
                        )
                        .orElseGet(() -> {
                            LearnerGroupTrainingAssignment created =
                                    new LearnerGroupTrainingAssignment();
                            created.setGroupId(group.getId());
                            created.setTrainingId(request.getTrainingId());
                            created.setAssignedBy(actorId());
                            created.setDueAt(request.getDueAt());
                            return trainingAssignmentRepository.save(created);
                        });

        if (persistentAssignment.getId() == null) {
            throw new IllegalStateException(
                    "Affectation groupe-formation non persistante."
            );
        }

        if (request.getDueAt() != null
                && !request.getDueAt().equals(
                    persistentAssignment.getDueAt()
                )) {
            persistentAssignment.setDueAt(request.getDueAt());
            trainingAssignmentRepository.save(persistentAssignment);
        }

        List<Long> learnerIds =
                memberRepository
                        .findByGroup_IdOrderByAddedAtAsc(
                            group.getId()
                        )
                        .stream()
                        .map(LearnerGroupMember::getLearnerId)
                        .distinct()
                        .toList();

        int totalMembers = learnerIds.size();

        if (learnerIds.isEmpty()) {
            return new LearnerGroupTrainingAssignmentResponse(
                    0,
                    0,
                    0,
                    0,
                    List.of()
            );
        }

        List<Long> learnerIdsToAssign =
                learnerIds.stream()
                        .filter(
                            learnerId ->
                                !enrollmentRepository
                                    .existsByLearnerIdAndTrainingId(
                                        learnerId,
                                        request.getTrainingId()
                                    )
                        )
                        .toList();

        int alreadyEnrolled =
                totalMembers - learnerIdsToAssign.size();

        if (learnerIdsToAssign.isEmpty()) {
            return new LearnerGroupTrainingAssignmentResponse(
                    totalMembers,
                    0,
                    alreadyEnrolled,
                    0,
                    List.of()
            );
        }

        TrainingAssignmentRequest assignmentRequest =
                new TrainingAssignmentRequest();

        assignmentRequest.setTrainingId(request.getTrainingId());
        assignmentRequest.setLearnerIds(learnerIdsToAssign);
        assignmentRequest.setDueAt(request.getDueAt());

        List<EnrollmentResponse> assignedEnrollments =
                enrollmentAccessService.assignLearners(
                    assignmentRequest
                );

        if (assignedEnrollments.size()
                != learnerIdsToAssign.size()) {
            throw new IllegalStateException(
                    "Affectation collective incomplete."
            );
        }

        return new LearnerGroupTrainingAssignmentResponse(
                totalMembers,
                assignedEnrollments.size(),
                alreadyEnrolled,
                0,
                assignedEnrollments
        );
    }

    @Transactional(readOnly = true)
    public List<LearnerGroupTrainingAssignmentRecordResponse>
            getTrainingAssignments(Long groupId) {
        LearnerGroup group = requireManagedGroup(groupId);

        List<Long> learnerIds =
                memberRepository
                        .findByGroup_IdOrderByAddedAtAsc(
                            group.getId()
                        )
                        .stream()
                        .map(LearnerGroupMember::getLearnerId)
                        .distinct()
                        .toList();

        int totalMembers = learnerIds.size();

        List<LearnerGroupTrainingAssignmentRecordResponse> result =
                new ArrayList<>();

        for (LearnerGroupTrainingAssignment assignment :
                trainingAssignmentRepository
                        .findByGroupIdOrderByAssignedAtAscIdAsc(
                            group.getId()
                        )) {

            var training = trainingRepository
                    .findById(assignment.getTrainingId())
                    .orElse(null);

            if (training == null) {
                continue;
            }

            int enrolledMembers = 0;

            for (Long learnerId : learnerIds) {
                if (enrollmentRepository
                        .existsByLearnerIdAndTrainingId(
                            learnerId,
                            assignment.getTrainingId()
                        )) {
                    enrolledMembers++;
                }
            }

            result.add(
                new LearnerGroupTrainingAssignmentRecordResponse(
                    assignment,
                    training.getTitle(),
                    totalMembers,
                    enrolledMembers
                )
            );
        }

        return result;
    }

    @Transactional
    public List<LearnerGroupMemberResponse> addMembers(
            Long groupId,
            LearnerGroupMemberAddRequest request
    ) {
        LearnerGroup group = requireManagedGroup(groupId);

        List<Long> requestedIds =
                request.getLearnerIds()
                        .stream()
                        .distinct()
                        .toList();

        List<InternalLearnerDirectoryEntry> identities =
                directoryClient.resolveLearners(requestedIds);

        Map<Long, InternalLearnerDirectoryEntry> byId =
                identities.stream()
                        .collect(
                            Collectors.toMap(
                                InternalLearnerDirectoryEntry::getLearnerId,
                                Function.identity(),
                                (first, second) -> first
                            )
                        );

        if (byId.size() != requestedIds.size()) {
            throw new IllegalArgumentException(
                    "Un ou plusieurs apprenants sont introuvables."
            );
        }

        Long actorId = actorId();

        List<LearnerGroupMember> toCreate =
                requestedIds.stream()
                        .filter(
                            learnerId ->
                                !memberRepository
                                    .existsByGroup_IdAndLearnerId(
                                        group.getId(),
                                        learnerId
                                    )
                        )
                        .map(
                            learnerId ->
                                new LearnerGroupMember(
                                    group,
                                    learnerId,
                                    actorId
                                )
                        )
                        .toList();

        if (!toCreate.isEmpty()) {
            memberRepository.saveAll(toCreate);
        }

        return getMembers(group.getId());
    }

    @Transactional
    public void removeMember(
            Long groupId,
            Long learnerId
    ) {
        LearnerGroup group = requireManagedGroup(groupId);

        if (learnerId == null || learnerId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant apprenant invalide."
            );
        }

        LearnerGroupMember member =
                memberRepository
                        .findByGroup_IdAndLearnerId(
                            group.getId(),
                            learnerId
                        )
                        .orElseThrow(
                            () -> new IllegalArgumentException(
                                "Cet apprenant ne fait pas partie du groupe."
                            )
                        );

        memberRepository.delete(member);
    }

    private LearnerGroup requireManagedGroup(Long groupId) {
        requireManager();

        if (groupId == null || groupId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant groupe invalide."
            );
        }

        LearnerGroup group =
                groupRepository.findById(groupId)
                        .orElseThrow(
                            () -> new IllegalArgumentException(
                                "Groupe introuvable."
                            )
                        );

        if (!isAdmin()
                && !group.getOwnerId().equals(actorId())) {
            throw new AccessDeniedException(
                    "Un formateur ne peut gerer que ses propres groupes."
            );
        }

        return group;
    }

    private List<LearnerGroupMemberResponse> toMemberResponses(
            List<LearnerGroupMember> members
    ) {
        if (members.isEmpty()) {
            return List.of();
        }

        List<Long> learnerIds =
                members.stream()
                        .map(LearnerGroupMember::getLearnerId)
                        .distinct()
                        .toList();

        Map<Long, InternalLearnerDirectoryEntry> identities =
                directoryClient.resolveLearners(learnerIds)
                        .stream()
                        .collect(
                            Collectors.toMap(
                                InternalLearnerDirectoryEntry::getLearnerId,
                                Function.identity(),
                                (first, second) -> first
                            )
                        );

        return members.stream()
                .map(
                    member ->
                        new LearnerGroupMemberResponse(
                            member,
                            identities.get(
                                member.getLearnerId()
                            )
                        )
                )
                .toList();
    }

    private LearnerGroupResponse toResponse(
            LearnerGroup group
    ) {
        return new LearnerGroupResponse(
                group,
                memberRepository.countByGroup_Id(
                    group.getId()
                )
        );
    }

    private String normalizeName(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Le nom du groupe est obligatoire."
            );
        }

        return value.trim();
    }

    private String normalizeDescription(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private void requireManager() {
        String role = actorRole();

        if (!"ADMIN".equals(role)
                && !"FORMATEUR".equals(role)) {
            throw new AccessDeniedException(
                    "La gestion des groupes est reservee aux administrateurs et formateurs."
            );
        }
    }

    private boolean isAdmin() {
        return "ADMIN".equals(actorRole());
    }

    private Long actorId() {
        return authenticatedUserService.getUserId();
    }

    private String actorRole() {
        return authenticatedUserService.getRole();
    }
}
