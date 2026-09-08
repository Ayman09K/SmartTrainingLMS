package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.AlertResponse;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.security.TrainerLearnerAccessGuard;
import com.smarttraining.analytics.service.LearningAlertService;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/analytics/alerts")
public class LearningAlertController {

    private final LearningAlertService learningAlertService;
    private final TrainerLearnerAccessGuard accessGuard;

    public LearningAlertController(
            LearningAlertService learningAlertService,
            TrainerLearnerAccessGuard accessGuard
    ) {
        this.learningAlertService = learningAlertService;
        this.accessGuard = accessGuard;
    }

    @PostMapping("/generate/learner/{learnerId}/training/{trainingId}")
    public List<AlertResponse> generateAlertsForLearnerTraining(
            @PathVariable Long learnerId,
            @PathVariable Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireEducatorTrainingAccess(actor, learnerId, trainingId);

        return learningAlertService
                .generateAlertsForLearnerTraining(learnerId, trainingId);
    }

    @GetMapping("/me")
    public List<AlertResponse> getMyAlerts(
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireLearner(actor);

        return learningAlertService.getAlertsByLearner(actor.getUserId());
    }

    @GetMapping("/learner/{learnerId}")
    public List<AlertResponse> getAlertsByLearner(
            @PathVariable Long learnerId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);

        if (actor.getUserId().equals(learnerId)) {
            return learningAlertService.getAlertsByLearner(learnerId);
        }

        if ("APPRENANT".equals(actor.getRole())) {
            throw new AccessDeniedException(
                    "Un apprenant ne peut consulter que ses propres alertes."
            );
        }

        if ("ADMIN".equals(actor.getRole())) {
            return learningAlertService.getAlertsByLearner(learnerId);
        }

        List<Long> allowedTrainingIds =
                accessGuard.requireAccess(actor, learnerId);

        return learningAlertService.getAlertsByLearner(learnerId)
                .stream()
                .filter(item ->
                        item.getTrainingId() != null
                        && allowedTrainingIds.contains(item.getTrainingId())
                )
                .toList();
    }

    @GetMapping("/training/{trainingId}")
    public List<AlertResponse> getAlertsByTraining(
            @PathVariable Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireEducator(actor);

        List<AlertResponse> alerts =
                learningAlertService.getAlertsByTraining(trainingId);

        if ("ADMIN".equals(actor.getRole())) {
            return alerts;
        }

        return alerts.stream()
                .filter(item -> canTrainerAccess(actor, item))
                .toList();
    }

    @GetMapping("/open")
    public List<AlertResponse> getOpenAlerts(
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireEducator(actor);

        List<AlertResponse> alerts =
                learningAlertService.getOpenAlerts();

        if ("ADMIN".equals(actor.getRole())) {
            return alerts;
        }

        return alerts.stream()
                .filter(item -> canTrainerAccess(actor, item))
                .toList();
    }

    @GetMapping("/{alertId}")
    public AlertResponse getAlertById(
            @PathVariable Long alertId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        AlertResponse alert = learningAlertService.getAlertById(alertId);

        if (actor.getUserId().equals(alert.getLearnerId())) {
            return alert;
        }

        if ("APPRENANT".equals(actor.getRole())) {
            throw new AccessDeniedException(
                    "Cette alerte appartient a un autre apprenant."
            );
        }

        requireEducatorAlertAccess(actor, alert);
        return alert;
    }

    @PutMapping("/{alertId}/in-progress")
    public AlertResponse markInProgress(
            @PathVariable Long alertId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        AlertResponse alert = learningAlertService.getAlertById(alertId);

        requireEducatorAlertAccess(actor, alert);
        return learningAlertService.markInProgress(alertId);
    }

    @PutMapping("/{alertId}/resolve")
    public AlertResponse resolveAlert(
            @PathVariable Long alertId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        AlertResponse alert = learningAlertService.getAlertById(alertId);

        requireEducatorAlertAccess(actor, alert);
        return learningAlertService.resolveAlert(alertId);
    }

    @PutMapping("/{alertId}/ignore")
    public AlertResponse ignoreAlert(
            @PathVariable Long alertId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        AlertResponse alert = learningAlertService.getAlertById(alertId);

        requireEducatorAlertAccess(actor, alert);
        return learningAlertService.ignoreAlert(alertId);
    }

    private void requireLearner(AuthenticatedUser actor) {
        if (actor == null
                || (!"APPRENANT".equals(actor.getRole())
                && !"FORMATEUR".equals(actor.getRole())
                && !"ADMIN".equals(actor.getRole()))) {
            throw new AccessDeniedException(
                    "Cette route self-service necessite une identite utilisateur pouvant suivre une formation."
            );
        }
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
                    "Cette formation n'appartient pas au perimetre de ce formateur."
            );
        }
    }

    private void requireEducatorAlertAccess(
            AuthenticatedUser actor,
            AlertResponse alert
    ) {
        requireEducatorTrainingAccess(
                actor,
                alert.getLearnerId(),
                alert.getTrainingId()
        );
    }

    private boolean canTrainerAccess(
            AuthenticatedUser actor,
            AlertResponse alert
    ) {
        try {
            requireEducatorAlertAccess(actor, alert);
            return true;
        } catch (AccessDeniedException exception) {
            return false;
        }
    }
}
