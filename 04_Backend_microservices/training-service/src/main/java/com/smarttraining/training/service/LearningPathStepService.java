package com.smarttraining.training.service;

import com.smarttraining.training.dto.LearningPathStepAddRequest;
import com.smarttraining.training.dto.LearningPathStepReorderRequest;
import com.smarttraining.training.dto.LearningPathStepRequiredRequest;
import com.smarttraining.training.dto.LearningPathStepResponse;
import com.smarttraining.training.entity.LearningPath;
import com.smarttraining.training.entity.LearningPathStep;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.enums.LearningPathStatus;
import com.smarttraining.training.enums.TrainingStatus;
import com.smarttraining.training.repository.LearningPathAssignmentRepository;
import com.smarttraining.training.repository.LearningPathGroupAssignmentRepository;
import com.smarttraining.training.repository.LearningPathRepository;
import com.smarttraining.training.repository.LearningPathStepRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.LearningPathOwnershipService;
import com.smarttraining.training.security.TrainingOwnershipService;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningPathStepService {

    private final LearningPathRepository pathRepository;
    private final LearningPathStepRepository stepRepository;
    private final TrainingRepository trainingRepository;
    private final LearningPathAssignmentRepository assignmentRepository;
    private final LearningPathGroupAssignmentRepository groupAssignmentRepository;
    private final LearningPathOwnershipService pathOwnershipService;
    private final TrainingOwnershipService trainingOwnershipService;

    public LearningPathStepService(
            LearningPathRepository pathRepository,
            LearningPathStepRepository stepRepository,
            TrainingRepository trainingRepository,
            LearningPathAssignmentRepository assignmentRepository,
            LearningPathGroupAssignmentRepository groupAssignmentRepository,
            LearningPathOwnershipService pathOwnershipService,
            TrainingOwnershipService trainingOwnershipService
    ) {
        this.pathRepository = pathRepository;
        this.stepRepository = stepRepository;
        this.trainingRepository = trainingRepository;
        this.assignmentRepository = assignmentRepository;
        this.groupAssignmentRepository = groupAssignmentRepository;
        this.pathOwnershipService = pathOwnershipService;
        this.trainingOwnershipService = trainingOwnershipService;
    }

    @Transactional(readOnly = true)
    public List<LearningPathStepResponse> getSteps(Long pathId) {
        LearningPath path = findManageablePath(pathId);

        List<LearningPathStep> steps =
                stepRepository.findByPathIdOrderByPositionAscIdAsc(path.getId());

        return toResponses(steps);
    }

    @Transactional
    public LearningPathStepResponse addStep(
            Long pathId,
            LearningPathStepAddRequest request
    ) {
        LearningPath path = findManageablePath(pathId);
        requireStepEditable(path);

        Training training = trainingRepository.findById(request.getTrainingId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Formation introuvable")
                );

        trainingOwnershipService.assertCanManageTraining(training);

        TrainingStatus trainingStatus = training.getStatus() == null
                ? TrainingStatus.DRAFT
                : training.getStatus().normalized();

        if (trainingStatus == TrainingStatus.ARCHIVED) {
            throw new IllegalArgumentException(
                    "Une formation archivee ne peut pas etre ajoutee a un parcours"
            );
        }

        if (path.getStatus() == LearningPathStatus.PUBLISHED
                && trainingStatus != TrainingStatus.PUBLISHED) {
            throw new IllegalArgumentException(
                    "Un parcours publie ne peut contenir que des formations publiees"
            );
        }

        if (stepRepository.existsByPathIdAndTrainingId(
                path.getId(),
                training.getId()
        )) {
            throw new IllegalArgumentException(
                    "Cette formation est deja presente dans le parcours"
            );
        }

        Integer maxPosition =
                stepRepository.findMaxPositionByPathId(path.getId());

        LearningPathStep step = new LearningPathStep();
        step.setPathId(path.getId());
        step.setTrainingId(training.getId());
        step.setPosition((maxPosition == null ? 0 : maxPosition) + 1);
        step.setRequired(
                request.getRequired() == null
                        ? Boolean.TRUE
                        : request.getRequired()
        );

        LearningPathStep saved = stepRepository.save(step);

        return new LearningPathStepResponse(saved, training);
    }

    @Transactional
    public LearningPathStepResponse updateRequired(
            Long pathId,
            Long stepId,
            LearningPathStepRequiredRequest request
    ) {
        LearningPath path = findManageablePath(pathId);
        requireStepEditable(path);

        LearningPathStep step = findStep(path.getId(), stepId);
        step.setRequired(request.getRequired());

        LearningPathStep saved = stepRepository.save(step);
        Training training = trainingRepository.findById(saved.getTrainingId())
                .orElse(null);

        return new LearningPathStepResponse(saved, training);
    }

    @Transactional
    public List<LearningPathStepResponse> reorderSteps(
            Long pathId,
            LearningPathStepReorderRequest request
    ) {
        LearningPath path = findManageablePath(pathId);
        requireStepEditable(path);

        List<LearningPathStep> existing =
                stepRepository.findByPathIdOrderByPositionAscIdAsc(path.getId());

        List<Long> requestedIds = request.getStepIds();

        if (requestedIds.size() != existing.size()) {
            throw new IllegalArgumentException(
                    "Le nouvel ordre doit contenir exactement toutes les etapes du parcours"
            );
        }

        Set<Long> requestedSet = new HashSet<>(requestedIds);

        if (requestedSet.size() != requestedIds.size()) {
            throw new IllegalArgumentException(
                    "Le nouvel ordre contient une etape en double"
            );
        }

        Set<Long> existingSet = existing.stream()
                .map(LearningPathStep::getId)
                .collect(java.util.stream.Collectors.toSet());

        if (!requestedSet.equals(existingSet)) {
            throw new IllegalArgumentException(
                    "Le nouvel ordre contient une etape inconnue ou manquante"
            );
        }

        Map<Long, LearningPathStep> byId = new HashMap<>();
        for (LearningPathStep step : existing) {
            byId.put(step.getId(), step);
        }

        for (int i = 0; i < requestedIds.size(); i++) {
            byId.get(requestedIds.get(i)).setPosition(i + 1);
        }

        stepRepository.saveAll(existing);
        stepRepository.flush();

        return getSteps(path.getId());
    }

    @Transactional
    public void removeStep(
            Long pathId,
            Long stepId
    ) {
        LearningPath path = findManageablePath(pathId);
        requireStepEditable(path);

        LearningPathStep step = findStep(path.getId(), stepId);

        if (path.getStatus() == LearningPathStatus.PUBLISHED) {
            List<LearningPathStep> current =
                    stepRepository.findByPathIdOrderByPositionAscIdAsc(
                            path.getId()
                    );

            if (current.size() <= 1) {
                throw new IllegalArgumentException(
                        "Un parcours publie doit conserver au moins une formation"
                );
            }
        }

        stepRepository.delete(step);
        stepRepository.flush();

        normalizePositions(path.getId());
    }

    private LearningPath findManageablePath(Long pathId) {
        LearningPath path = pathRepository.findById(pathId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Parcours introuvable")
                );

        pathOwnershipService.assertCanManagePath(path);
        return path;
    }

    private LearningPathStep findStep(
            Long pathId,
            Long stepId
    ) {
        return stepRepository.findByIdAndPathId(stepId, pathId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Etape du parcours introuvable"
                        )
                );
    }

    private void requireStepEditable(LearningPath path) {
        if (path.getStatus() == LearningPathStatus.DRAFT) {
            return;
        }

        if (path.getStatus() == LearningPathStatus.PUBLISHED) {
            boolean hasLearnerAssignments =
                    !assignmentRepository
                            .findByPathIdOrderByAssignedAtAscIdAsc(
                                    path.getId()
                            )
                            .isEmpty();

            boolean hasGroupAssignments =
                    !groupAssignmentRepository
                            .findByPathIdOrderByAssignedAtAscIdAsc(
                                    path.getId()
                            )
                            .isEmpty();

            if (!hasLearnerAssignments && !hasGroupAssignments) {
                return;
            }

            throw new IllegalArgumentException(
                    "La sequence d'un parcours deja affecte est verrouillee pour proteger les inscriptions existantes"
            );
        }

        throw new IllegalArgumentException(
                "Un parcours archive est en lecture seule"
        );
    }

    private void normalizePositions(Long pathId) {
        List<LearningPathStep> steps =
                stepRepository.findByPathIdOrderByPositionAscIdAsc(pathId);

        for (int i = 0; i < steps.size(); i++) {
            steps.get(i).setPosition(i + 1);
        }

        stepRepository.saveAll(steps);
        stepRepository.flush();
    }

    private List<LearningPathStepResponse> toResponses(
            List<LearningPathStep> steps
    ) {
        Set<Long> trainingIds = steps.stream()
                .map(LearningPathStep::getTrainingId)
                .collect(java.util.stream.Collectors.toSet());

        Map<Long, Training> trainings = new HashMap<>();

        for (Training training : trainingRepository.findAllById(trainingIds)) {
            trainings.put(training.getId(), training);
        }

        return steps.stream()
                .map(step ->
                        new LearningPathStepResponse(
                                step,
                                trainings.get(step.getTrainingId())
                        )
                )
                .toList();
    }
}