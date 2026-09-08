package com.smarttraining.training.service;

import com.smarttraining.training.dto.LearningPathCatalogResponse;
import com.smarttraining.training.dto.LearningPathStepResponse;
import com.smarttraining.training.entity.LearningPath;
import com.smarttraining.training.entity.LearningPathStep;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.enums.LearningPathStatus;
import com.smarttraining.training.enums.TrainingStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import com.smarttraining.training.repository.LearningPathAssignmentRepository;
import com.smarttraining.training.repository.LearningPathRepository;
import com.smarttraining.training.repository.LearningPathStepRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.AuthenticatedUserService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningPathCatalogService {

    private final LearningPathRepository pathRepository;
    private final LearningPathStepRepository stepRepository;
    private final LearningPathAssignmentRepository assignmentRepository;
    private final TrainingRepository trainingRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final LearningPathVersionService pathVersionService;

    public LearningPathCatalogService(
            LearningPathRepository pathRepository,
            LearningPathStepRepository stepRepository,
            LearningPathAssignmentRepository assignmentRepository,
            TrainingRepository trainingRepository,
            AuthenticatedUserService authenticatedUserService,
            LearningPathVersionService pathVersionService
    ) {
        this.pathRepository = pathRepository;
        this.stepRepository = stepRepository;
        this.assignmentRepository = assignmentRepository;
        this.trainingRepository = trainingRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.pathVersionService = pathVersionService;
    }

    @Transactional(readOnly = true)
    public List<LearningPathCatalogResponse> getCatalog() {
        Long learnerId = authenticatedUserService.getUserId();

        List<LearningPathCatalogResponse> result = new ArrayList<>();

        for (LearningPath path :
                pathRepository.findAllByOrderByCreatedAtDesc()) {

            LearningPathCatalogResponse item =
                    buildCatalogItemIfVisible(path, learnerId);

            if (item != null) {
                result.add(item);
            }
        }

        return result;
    }

    @Transactional(readOnly = true)
    public LearningPathCatalogResponse getCatalogDetail(Long pathId) {
        Long learnerId = authenticatedUserService.getUserId();

        LearningPath path = pathRepository.findById(pathId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Parcours introuvable"
                        )
                );

        if (path.getStatus() != LearningPathStatus.PUBLISHED) {
            throw new IllegalArgumentException(
                    "Parcours indisponible dans le catalogue"
            );
        }

        boolean assigned = assignmentRepository
                .existsByPathIdAndLearnerId(
                        path.getId(),
                        learnerId
                );

        if (!assigned
                && !pathVersionService.isLatestPublishedVersion(path)) {
            throw new IllegalArgumentException(
                    "Cette version du parcours a ete remplacee"
            );
        }

        TrainingVisibility visibility = path.getVisibility() == null
                ? TrainingVisibility.PRIVATE
                : path.getVisibility();

        if (!assigned && visibility != TrainingVisibility.PUBLIC) {
            throw new AccessDeniedException(
                    "Ce parcours n'est pas visible pour cet utilisateur"
            );
        }

        LearningPathCatalogResponse item =
                buildValidPublishedItem(path, learnerId, assigned);

        if (item == null) {
            throw new IllegalArgumentException(
                    "Parcours temporairement indisponible"
            );
        }

        return item;
    }

    private LearningPathCatalogResponse buildCatalogItemIfVisible(
            LearningPath path,
            Long learnerId
    ) {
        if (path == null
                || path.getStatus() != LearningPathStatus.PUBLISHED) {
            return null;
        }

        if (!pathVersionService.isLatestPublishedVersion(path)) {
            return null;
        }

        boolean assigned = assignmentRepository
                .existsByPathIdAndLearnerId(
                        path.getId(),
                        learnerId
                );

        TrainingVisibility visibility = path.getVisibility() == null
                ? TrainingVisibility.PRIVATE
                : path.getVisibility();

        if (!assigned && visibility != TrainingVisibility.PUBLIC) {
            return null;
        }

        return buildValidPublishedItem(
                path,
                learnerId,
                assigned
        );
    }

    private LearningPathCatalogResponse buildValidPublishedItem(
            LearningPath path,
            Long learnerId,
            boolean assigned
    ) {
        List<LearningPathStep> steps =
                stepRepository.findByPathIdOrderByPositionAscIdAsc(
                        path.getId()
                );

        if (steps.isEmpty()) {
            return null;
        }

        Set<Long> trainingIds = steps.stream()
                .map(LearningPathStep::getTrainingId)
                .collect(Collectors.toSet());

        Map<Long, Training> trainingsById = new HashMap<>();

        for (Training training :
                trainingRepository.findAllById(trainingIds)) {
            trainingsById.put(training.getId(), training);
        }

        List<LearningPathStepResponse> trainingResponses =
                new ArrayList<>();

        int required = 0;
        int durationHours = 0;

        String coverImageUrl = path.getCoverImageUrl();
        String coverImagePath = path.getCoverImagePath();

        for (LearningPathStep step : steps) {
            Training training =
                    trainingsById.get(step.getTrainingId());

            if (training == null) {
                return null;
            }

            TrainingStatus status = training.getStatus() == null
                    ? TrainingStatus.DRAFT
                    : training.getStatus().normalized();

            if (status != TrainingStatus.PUBLISHED) {
                return null;
            }

            if (Boolean.TRUE.equals(step.getRequired())) {
                required++;
            }

            if (training.getEstimatedDurationHours() != null
                    && training.getEstimatedDurationHours() > 0) {
                durationHours += training.getEstimatedDurationHours();
            }

            if (coverImageUrl == null
                    && coverImagePath == null
                    && (
                        training.getCoverImageUrl() != null
                        || training.getCoverImagePath() != null
                    )) {
                coverImageUrl = training.getCoverImageUrl();
                coverImagePath = training.getCoverImagePath();
            }

            trainingResponses.add(
                    new LearningPathStepResponse(
                            step,
                            training
                    )
            );
        }

        int total = steps.size();
        int optional = total - required;

        return new LearningPathCatalogResponse(
                path,
                total,
                required,
                optional,
                durationHours,
                coverImageUrl,
                coverImagePath,
                assigned,
                trainingResponses
        );
    }
}
