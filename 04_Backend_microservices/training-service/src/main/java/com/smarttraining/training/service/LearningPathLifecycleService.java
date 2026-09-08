package com.smarttraining.training.service;

import com.smarttraining.training.dto.LearningPathResponse;
import com.smarttraining.training.entity.LearningPath;
import com.smarttraining.training.entity.LearningPathStep;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.enums.LearningPathStatus;
import com.smarttraining.training.enums.TrainingStatus;
import com.smarttraining.training.repository.LearningPathRepository;
import com.smarttraining.training.repository.LearningPathStepRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.LearningPathOwnershipService;
import com.smarttraining.training.security.TrainingOwnershipService;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningPathLifecycleService {

    private final LearningPathRepository pathRepository;
    private final LearningPathStepRepository stepRepository;
    private final TrainingRepository trainingRepository;
    private final LearningPathOwnershipService pathOwnershipService;
    private final TrainingOwnershipService trainingOwnershipService;

    public LearningPathLifecycleService(
            LearningPathRepository pathRepository,
            LearningPathStepRepository stepRepository,
            TrainingRepository trainingRepository,
            LearningPathOwnershipService pathOwnershipService,
            TrainingOwnershipService trainingOwnershipService
    ) {
        this.pathRepository = pathRepository;
        this.stepRepository = stepRepository;
        this.trainingRepository = trainingRepository;
        this.pathOwnershipService = pathOwnershipService;
        this.trainingOwnershipService = trainingOwnershipService;
    }

    @Transactional
    public LearningPathResponse publishPath(Long pathId) {
        LearningPath path = findManageablePath(pathId);

        if (path.getStatus() != LearningPathStatus.DRAFT) {
            throw new IllegalArgumentException(
                    "Seul un parcours en brouillon peut etre publie"
            );
        }

        int versionNumber = path.getVersionNumber() == null
                ? 1
                : Math.max(1, path.getVersionNumber());

        if (versionNumber > 1
                && (path.getVersionNote() == null
                || path.getVersionNote().isBlank())) {
            throw new IllegalArgumentException(
                    "Ajoutez une note de version avant de publier cette revision"
            );
        }

        List<LearningPathStep> steps =
                stepRepository.findByPathIdOrderByPositionAscIdAsc(pathId);

        if (steps.isEmpty()) {
            throw new IllegalArgumentException(
                    "Un parcours doit contenir au moins une formation avant publication"
            );
        }

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
                        "Toutes les formations du parcours doivent etre publiees"
                );
            }
        }

        path.setStatus(LearningPathStatus.PUBLISHED);

        return new LearningPathResponse(
                pathRepository.save(path)
        );
    }

    @Transactional
    public LearningPathResponse archivePath(Long pathId) {
        LearningPath path = findManageablePath(pathId);

        if (path.getStatus() != LearningPathStatus.PUBLISHED) {
            throw new IllegalArgumentException(
                    "Seul un parcours publie peut etre archive"
            );
        }

        path.setStatus(LearningPathStatus.ARCHIVED);

        return new LearningPathResponse(
                pathRepository.save(path)
        );
    }

    @Transactional
    public LearningPathResponse unarchivePath(Long pathId) {
        LearningPath path = findManageablePath(pathId);

        if (path.getStatus() != LearningPathStatus.ARCHIVED) {
            throw new IllegalArgumentException(
                    "Seul un parcours archive peut etre desarchive"
            );
        }

        Long rootId = path.getVersionRootId() == null
                ? path.getId()
                : path.getVersionRootId();

        int currentVersion = path.getVersionNumber() == null
                ? 1
                : Math.max(1, path.getVersionNumber());

        boolean newerPublishedVersionExists =
                pathRepository.findVersionFamily(rootId)
                        .stream()
                        .filter(item ->
                                item.getStatus()
                                        == LearningPathStatus.PUBLISHED
                        )
                        .anyMatch(item -> {
                            int version = item.getVersionNumber() == null
                                    ? 1
                                    : Math.max(
                                            1,
                                            item.getVersionNumber()
                                    );

                            return version > currentVersion;
                        });

        if (newerPublishedVersionExists) {
            throw new IllegalArgumentException(
                    "Une version plus recente de ce parcours est deja publiee"
            );
        }

        List<LearningPathStep> steps =
                stepRepository.findByPathIdOrderByPositionAscIdAsc(pathId);

        if (steps.isEmpty()) {
            throw new IllegalArgumentException(
                    "Un parcours doit contenir au moins une formation avant publication"
            );
        }

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
                        "Toutes les formations du parcours doivent etre publiees"
                );
            }
        }

        path.setStatus(LearningPathStatus.PUBLISHED);

        return new LearningPathResponse(
                pathRepository.save(path)
        );
    }

    private LearningPath findManageablePath(Long pathId) {
        LearningPath path = pathRepository.findById(pathId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Parcours introuvable")
                );

        pathOwnershipService.assertCanManagePath(path);
        return path;
    }
}
