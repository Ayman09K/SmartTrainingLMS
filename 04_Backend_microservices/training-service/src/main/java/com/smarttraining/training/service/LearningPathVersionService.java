package com.smarttraining.training.service;

import com.smarttraining.training.dto.LearningPathResponse;
import com.smarttraining.training.entity.LearningPath;
import com.smarttraining.training.entity.LearningPathStep;
import com.smarttraining.training.enums.LearningPathStatus;
import com.smarttraining.training.repository.LearningPathRepository;
import com.smarttraining.training.repository.LearningPathStepRepository;
import com.smarttraining.training.security.LearningPathOwnershipService;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningPathVersionService {

    private final LearningPathRepository pathRepository;
    private final LearningPathStepRepository stepRepository;
    private final LearningPathOwnershipService ownershipService;

    public LearningPathVersionService(
            LearningPathRepository pathRepository,
            LearningPathStepRepository stepRepository,
            LearningPathOwnershipService ownershipService
    ) {
        this.pathRepository = pathRepository;
        this.stepRepository = stepRepository;
        this.ownershipService = ownershipService;
    }

    @Transactional
    public LearningPathResponse createDraftVersion(Long pathId) {
        LearningPath source = findManageablePath(pathId);

        if (source.getStatus() != LearningPathStatus.PUBLISHED) {
            throw new IllegalArgumentException(
                    "Seul un parcours publie peut servir de base a une nouvelle version"
            );
        }

        if (!isLatestPublishedVersion(source)) {
            throw new IllegalArgumentException(
                    "Une nouvelle version doit etre creee depuis la derniere version publiee"
            );
        }

        List<LearningPath> family = findFamily(source);

        boolean draftExists = family.stream()
                .anyMatch(path ->
                        path.getStatus() == LearningPathStatus.DRAFT
                );

        if (draftExists) {
            throw new IllegalArgumentException(
                    "Une version brouillon existe deja pour ce parcours"
            );
        }

        int nextVersion = family.stream()
                .mapToInt(this::normalizedVersionNumber)
                .max()
                .orElse(1) + 1;

        Long rootId = resolveRootId(source);

        LearningPath draft = new LearningPath();
        draft.setOwnerId(source.getOwnerId());
        draft.setOwnerRole(source.getOwnerRole());
        draft.setTitle(source.getTitle());
        draft.setShortDescription(source.getShortDescription());
        draft.setDescription(source.getDescription());
        draft.setObjectives(source.getObjectives());
        draft.setCoverImageUrl(source.getCoverImageUrl());
        draft.setCoverImagePath(source.getCoverImagePath());
        draft.setVisibility(source.getVisibility());
        draft.setStatus(LearningPathStatus.DRAFT);
        draft.setVersionRootId(rootId);
        draft.setPreviousVersionId(source.getId());
        draft.setVersionNumber(nextVersion);

        LearningPath saved = pathRepository.save(draft);

        List<LearningPathStep> sourceSteps =
                stepRepository.findByPathIdOrderByPositionAscIdAsc(
                        source.getId()
                );

        List<LearningPathStep> copiedSteps = sourceSteps.stream()
                .map(step -> copyStep(step, saved.getId()))
                .toList();

        if (!copiedSteps.isEmpty()) {
            stepRepository.saveAll(copiedSteps);
            stepRepository.flush();
        }

        return new LearningPathResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<LearningPathResponse> listVersions(Long pathId) {
        LearningPath path = findManageablePath(pathId);

        return findFamily(path).stream()
                .sorted(
                        Comparator
                                .comparingInt(
                                        this::normalizedVersionNumber
                                )
                                .reversed()
                                .thenComparing(
                                        LearningPath::getId,
                                        Comparator.reverseOrder()
                                )
                )
                .map(LearningPathResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isLatestPublishedVersion(LearningPath path) {
        if (path == null
                || path.getId() == null
                || path.getStatus() != LearningPathStatus.PUBLISHED) {
            return false;
        }

        int current = normalizedVersionNumber(path);

        return findFamily(path).stream()
                .filter(item ->
                        item.getStatus() == LearningPathStatus.PUBLISHED
                )
                .mapToInt(this::normalizedVersionNumber)
                .max()
                .orElse(current) == current;
    }

    public Long resolveRootId(LearningPath path) {
        if (path == null || path.getId() == null) {
            throw new IllegalArgumentException(
                    "Parcours versionne invalide"
            );
        }

        return path.getVersionRootId() == null
                ? path.getId()
                : path.getVersionRootId();
    }

    public int normalizedVersionNumber(LearningPath path) {
        if (path == null || path.getVersionNumber() == null) {
            return 1;
        }

        return Math.max(1, path.getVersionNumber());
    }

    private List<LearningPath> findFamily(LearningPath path) {
        return pathRepository.findVersionFamily(
                resolveRootId(path)
        );
    }

    private LearningPath findManageablePath(Long pathId) {
        LearningPath path = pathRepository.findById(pathId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Parcours introuvable"
                        )
                );

        ownershipService.assertCanManagePath(path);
        return path;
    }

    private LearningPathStep copyStep(
            LearningPathStep source,
            Long targetPathId
    ) {
        LearningPathStep copy = new LearningPathStep();
        copy.setPathId(targetPathId);
        copy.setTrainingId(source.getTrainingId());
        copy.setPosition(source.getPosition());
        copy.setRequired(source.getRequired());
        return copy;
    }
}
