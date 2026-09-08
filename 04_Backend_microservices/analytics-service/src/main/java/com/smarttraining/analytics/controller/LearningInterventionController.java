package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.InterventionRequest;
import com.smarttraining.analytics.dto.InterventionResponse;
import com.smarttraining.analytics.enums.InterventionStatus;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.security.TrainerLearnerAccessGuard;
import com.smarttraining.analytics.service.LearningInterventionService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/analytics/interventions")
public class LearningInterventionController {

    private final LearningInterventionService learningInterventionService;
    private final TrainerLearnerAccessGuard accessGuard;

    public LearningInterventionController(
            LearningInterventionService learningInterventionService,
            TrainerLearnerAccessGuard accessGuard
    ) {
        this.learningInterventionService = learningInterventionService;
        this.accessGuard = accessGuard;
    }

    @PostMapping
    public InterventionResponse createIntervention(
            @Valid @RequestBody InterventionRequest request,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);

        requireEducatorTrainingAccess(
                actor,
                request.getLearnerId(),
                request.getTrainingId()
        );

        // Le trainerId transmis par le navigateur n'est jamais une source de confiance.
        request.setTrainerId(actor.getUserId());

        return learningInterventionService.createIntervention(request);
    }

    @GetMapping("/{interventionId}")
    public InterventionResponse getInterventionById(
            @PathVariable Long interventionId,
            JwtAuthenticationToken authentication
    ) {
        InterventionResponse item =
                learningInterventionService.getInterventionById(interventionId);

        requireReadAccess(
                AuthenticatedUser.from(authentication),
                item
        );

        return item;
    }

    @GetMapping("/learner/{learnerId}")
    public List<InterventionResponse> getInterventionsByLearner(
            @PathVariable Long learnerId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireEducator(actor);

        if ("ADMIN".equals(actor.getRole())) {
            return learningInterventionService
                    .getInterventionsByLearner(learnerId);
        }

        List<Long> allowedTrainingIds =
                accessGuard.requireAccess(actor, learnerId);

        return learningInterventionService
                .getInterventionsByLearner(learnerId)
                .stream()
                .filter(item ->
                        actor.getUserId().equals(item.getTrainerId())
                        && item.getTrainingId() != null
                        && allowedTrainingIds.contains(item.getTrainingId())
                )
                .toList();
    }

    @GetMapping("/trainer/{trainerId}")
    public List<InterventionResponse> getInterventionsByTrainer(
            @PathVariable Long trainerId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireEducator(actor);

        if (!"ADMIN".equals(actor.getRole())
                && !actor.getUserId().equals(trainerId)) {
            throw new AccessDeniedException(
                    "Un formateur ne peut consulter que ses propres interventions."
            );
        }

        return learningInterventionService
                .getInterventionsByTrainer(trainerId);
    }

    @GetMapping("/training/{trainingId}")
    public List<InterventionResponse> getInterventionsByTraining(
            @PathVariable Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireEducator(actor);

        List<InterventionResponse> items =
                learningInterventionService
                        .getInterventionsByTraining(trainingId);

        if ("ADMIN".equals(actor.getRole())) {
            return items;
        }

        return items.stream()
                .filter(item ->
                        actor.getUserId().equals(item.getTrainerId())
                        && canTrainerAccess(actor, item)
                )
                .toList();
    }

    @GetMapping("/status/{status}")
    public List<InterventionResponse> getInterventionsByStatus(
            @PathVariable InterventionStatus status,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireEducator(actor);

        List<InterventionResponse> items =
                learningInterventionService
                        .getInterventionsByStatus(status);

        if ("ADMIN".equals(actor.getRole())) {
            return items;
        }

        return items.stream()
                .filter(item ->
                        actor.getUserId().equals(item.getTrainerId())
                        && canTrainerAccess(actor, item)
                )
                .toList();
    }

    @PutMapping("/{interventionId}/done")
    public InterventionResponse markDone(
            @PathVariable Long interventionId,
            JwtAuthenticationToken authentication
    ) {
        InterventionResponse item =
                learningInterventionService.getInterventionById(interventionId);

        requireWriteAccess(
                AuthenticatedUser.from(authentication),
                item
        );

        return learningInterventionService.markDone(interventionId);
    }

    @PutMapping("/{interventionId}/cancel")
    public InterventionResponse markCancelled(
            @PathVariable Long interventionId,
            JwtAuthenticationToken authentication
    ) {
        InterventionResponse item =
                learningInterventionService.getInterventionById(interventionId);

        requireWriteAccess(
                AuthenticatedUser.from(authentication),
                item
        );

        return learningInterventionService.markCancelled(interventionId);
    }

    private void requireEducator(AuthenticatedUser actor) {
        if (actor == null || !actor.isEducator()) {
            throw new AccessDeniedException(
                    "Acces reserve a un formateur ou administrateur."
            );
        }
    }

    private void requireEducatorTrainingAccess(
            AuthenticatedUser actor,
            Long learnerId,
            Long trainingId
    ) {
        requireEducator(actor);

        if ("ADMIN".equals(actor.getRole())) {
            return;
        }

        List<Long> allowedTrainingIds =
                accessGuard.requireAccess(actor, learnerId);

        if (!allowedTrainingIds.contains(trainingId)) {
            throw new AccessDeniedException(
                    "Cet apprenant ou cette formation n'appartient pas au perimetre du formateur."
            );
        }
    }

    private void requireReadAccess(
            AuthenticatedUser actor,
            InterventionResponse item
    ) {
        requireWriteAccess(actor, item);
    }

    private void requireWriteAccess(
            AuthenticatedUser actor,
            InterventionResponse item
    ) {
        requireEducatorTrainingAccess(
                actor,
                item.getLearnerId(),
                item.getTrainingId()
        );

        if (!"ADMIN".equals(actor.getRole())
                && !actor.getUserId().equals(item.getTrainerId())) {
            throw new AccessDeniedException(
                    "Cette intervention appartient a un autre formateur."
            );
        }
    }

    private boolean canTrainerAccess(
            AuthenticatedUser actor,
            InterventionResponse item
    ) {
        try {
            requireEducatorTrainingAccess(
                    actor,
                    item.getLearnerId(),
                    item.getTrainingId()
            );
            return true;
        } catch (AccessDeniedException exception) {
            return false;
        }
    }
}
