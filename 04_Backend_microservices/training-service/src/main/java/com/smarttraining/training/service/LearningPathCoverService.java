package com.smarttraining.training.service;

import com.smarttraining.training.dto.FileUploadResponse;
import com.smarttraining.training.entity.LearningPath;
import com.smarttraining.training.enums.LearningPathStatus;
import com.smarttraining.training.repository.LearningPathRepository;
import com.smarttraining.training.security.LearningPathOwnershipService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningPathCoverService {

    private final LearningPathRepository pathRepository;
    private final LearningPathOwnershipService ownershipService;

    public LearningPathCoverService(
            LearningPathRepository pathRepository,
            LearningPathOwnershipService ownershipService
    ) {
        this.pathRepository = pathRepository;
        this.ownershipService = ownershipService;
    }

    @Transactional(readOnly = true)
    public void assertCanUploadCover(Long pathId) {
        LearningPath path = findPath(pathId);
        ownershipService.assertCanManagePath(path);
        requireCoverEditable(path);
    }

    @Transactional
    public FileUploadResponse attachCoverToPath(
            Long pathId,
            FileUploadResponse fileResponse
    ) {
        LearningPath path = findPath(pathId);

        ownershipService.assertCanManagePath(path);
        requireCoverEditable(path);

        path.setCoverImageUrl(fileResponse.getPublicUrl());
        path.setCoverImagePath(fileResponse.getRelativePath());

        pathRepository.save(path);

        fileResponse.setMessage(
                "Image de couverture associee au parcours"
        );

        return fileResponse;
    }

    private LearningPath findPath(Long pathId) {
        if (pathId == null || pathId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant du parcours invalide"
            );
        }

        return pathRepository.findById(pathId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Parcours introuvable"
                        )
                );
    }

    private void requireCoverEditable(LearningPath path) {
        if (path.getStatus() == LearningPathStatus.ARCHIVED) {
            throw new IllegalArgumentException(
                    "Un parcours archive est en lecture seule"
            );
        }
    }
}