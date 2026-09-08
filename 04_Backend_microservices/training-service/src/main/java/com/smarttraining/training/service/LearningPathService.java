package com.smarttraining.training.service;

import com.smarttraining.training.dto.LearningPathRequest;
import com.smarttraining.training.dto.LearningPathResponse;
import com.smarttraining.training.entity.LearningPath;
import com.smarttraining.training.enums.LearningPathStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import com.smarttraining.training.repository.LearningPathAssignmentRepository;
import com.smarttraining.training.repository.LearningPathGroupAssignmentRepository;
import com.smarttraining.training.repository.LearningPathRepository;
import com.smarttraining.training.repository.LearningPathStepRepository;
import com.smarttraining.training.security.LearningPathOwnershipService;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningPathService {

    private final LearningPathRepository pathRepository;
    private final LearningPathStepRepository stepRepository;
    private final LearningPathAssignmentRepository assignmentRepository;
    private final LearningPathGroupAssignmentRepository groupAssignmentRepository;
    private final LearningPathOwnershipService ownershipService;

    public LearningPathService(
            LearningPathRepository pathRepository,
            LearningPathStepRepository stepRepository,
            LearningPathAssignmentRepository assignmentRepository,
            LearningPathGroupAssignmentRepository groupAssignmentRepository,
            LearningPathOwnershipService ownershipService
    ) {
        this.pathRepository = pathRepository;
        this.stepRepository = stepRepository;
        this.assignmentRepository = assignmentRepository;
        this.groupAssignmentRepository = groupAssignmentRepository;
        this.ownershipService = ownershipService;
    }

    @Transactional
    public LearningPathResponse createPath(LearningPathRequest request) {
        ownershipService.requireAdminOrTrainer();

        LearningPath path = new LearningPath();
        path.setOwnerId(ownershipService.getActorId());
        path.setOwnerRole(ownershipService.getActorRole());
        path.setStatus(LearningPathStatus.DRAFT);
        path.setVersionNumber(1);

        applyRequest(path, request);

        LearningPath saved = pathRepository.save(path);

        if (saved.getVersionRootId() == null) {
            saved.setVersionRootId(saved.getId());
            saved = pathRepository.save(saved);
        }

        return new LearningPathResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<LearningPathResponse> getManageablePaths() {
        ownershipService.requireAdminOrTrainer();

        List<LearningPath> paths = ownershipService.isAdmin()
                ? pathRepository.findAllByOrderByCreatedAtDesc()
                : pathRepository.findByOwnerIdOrderByCreatedAtDesc(
                        ownershipService.getActorId()
                );

        return paths.stream()
                .map(LearningPathResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public LearningPathResponse getPath(Long pathId) {
        LearningPath path = findPath(pathId);
        ownershipService.assertCanManagePath(path);
        return new LearningPathResponse(path);
    }

    @Transactional
    public LearningPathResponse updatePath(
            Long pathId,
            LearningPathRequest request
    ) {
        LearningPath path = findPath(pathId);
        ownershipService.assertCanManagePath(path);
        requireMetadataEditable(path);

        applyRequest(path, request);

        return new LearningPathResponse(pathRepository.save(path));
    }

    @Transactional
    public void deletePath(Long pathId) {
        LearningPath path = findPath(pathId);
        ownershipService.assertCanManagePath(path);
        requireDeletable(path);

        if (!assignmentRepository
                .findByPathIdOrderByAssignedAtAscIdAsc(pathId)
                .isEmpty()
                || !groupAssignmentRepository
                .findByPathIdOrderByAssignedAtAscIdAsc(pathId)
                .isEmpty()) {
            throw new IllegalArgumentException(
                    "Un parcours deja affecte ne peut pas etre supprime"
            );
        }

        if (pathRepository.existsByPreviousVersionId(pathId)) {
            throw new IllegalArgumentException(
                    "Une version utilisee comme origine d'une version suivante ne peut pas etre supprimee"
            );
        }

        /*
         * P3:
         * - supprimer les traces d'affectation du parcours
         * - supprimer les etapes
         * - ne JAMAIS supprimer les enrollments Training existants
         */
        groupAssignmentRepository.deleteByPathId(pathId);
        assignmentRepository.deleteByPathId(pathId);
        stepRepository.deleteByPathId(pathId);

        pathRepository.delete(path);
        pathRepository.flush();
    }

    private LearningPath findPath(Long pathId) {
        return pathRepository.findById(pathId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Parcours introuvable")
                );
    }

    private void requireMetadataEditable(LearningPath path) {
        if (path.getStatus() == LearningPathStatus.ARCHIVED) {
            throw new IllegalArgumentException(
                    "Un parcours archive est en lecture seule"
            );
        }
    }

    private void requireDeletable(LearningPath path) {
        if (path.getStatus() != LearningPathStatus.DRAFT
                && path.getStatus() != LearningPathStatus.ARCHIVED) {
            throw new IllegalArgumentException(
                    "Un parcours publie doit etre archive avant suppression definitive"
            );
        }
    }

    private void applyRequest(
            LearningPath path,
            LearningPathRequest request
    ) {
        path.setTitle(request.getTitle());
        path.setShortDescription(request.getShortDescription());
        path.setDescription(request.getDescription());
        path.setObjectives(request.getObjectives());

        if (path.getStatus() == LearningPathStatus.DRAFT) {
            path.setVersionNote(request.getVersionNote());
        }

        path.setVisibility(
                request.getVisibility() == null
                        ? TrainingVisibility.PRIVATE
                        : request.getVisibility()
        );
    }
}
