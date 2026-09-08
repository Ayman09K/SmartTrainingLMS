package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.RiskIndicatorResponse;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.security.TrainerLearnerAccessGuard;
import com.smarttraining.analytics.service.AnalyticsService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics/risk")
public class RiskAnalyticsController {

    private final AnalyticsService analyticsService;
    private final TrainerLearnerAccessGuard accessGuard;

    public RiskAnalyticsController(
            AnalyticsService analyticsService,
            TrainerLearnerAccessGuard accessGuard
    ) {
        this.analyticsService = analyticsService;
        this.accessGuard = accessGuard;
    }

    @GetMapping("/me")
    public ResponseEntity<RiskIndicatorResponse> getMyRiskIndicator(
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireLearner(actor);

        return ResponseEntity.ok(
                analyticsService.getLearnerRiskIndicator(actor.getUserId())
        );
    }

    @GetMapping("/me/training/{trainingId}")
    public ResponseEntity<RiskIndicatorResponse> getMyTrainingRiskIndicator(
            @PathVariable Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireLearner(actor);

        return ResponseEntity.ok(
                analyticsService.getLearnerTrainingRiskIndicator(
                        actor.getUserId(),
                        trainingId
                )
        );
    }

    /*
     * Compatibilite historique :
     * - un apprenant ne peut lire que ses propres donnees ;
     * - ADMIN peut consulter la synthese globale ;
     * - FORMATEUR utilise la vue 360 pour la synthese globale, car elle filtre
     *   les formations qu'il est autorise a suivre.
     */
    @GetMapping("/learner/{learnerId}")
    public ResponseEntity<RiskIndicatorResponse> getLearnerRiskIndicator(
            @PathVariable Long learnerId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);

        if (actor.getUserId().equals(learnerId)) {
            return ResponseEntity.ok(
                    analyticsService.getLearnerRiskIndicator(learnerId)
            );
        }

        if ("APPRENANT".equals(actor.getRole())) {
            throw new AccessDeniedException(
                    "Un apprenant ne peut consulter que ses propres indicateurs."
            );
        }

        if ("ADMIN".equals(actor.getRole())) {
            return ResponseEntity.ok(
                    analyticsService.getLearnerRiskIndicator(learnerId)
            );
        }

        throw new AccessDeniedException(
                "La synthese globale d'un apprenant est disponible au formateur via la vue 360."
        );
    }

    @GetMapping("/learner/{learnerId}/training/{trainingId}")
    public ResponseEntity<RiskIndicatorResponse> getLearnerTrainingRiskIndicator(
            @PathVariable Long learnerId,
            @PathVariable Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);

        if (actor.getUserId().equals(learnerId)) {
            // Self-service learner capability for every authenticated business role.
        } else if ("APPRENANT".equals(actor.getRole())) {
            throw new AccessDeniedException(
                    "Un apprenant ne peut consulter que ses propres indicateurs."
            );
        } else if ("FORMATEUR".equals(actor.getRole())) {
            List<Long> allowedTrainingIds =
                    accessGuard.requireAccess(actor, learnerId);

            if (!allowedTrainingIds.contains(trainingId)) {
                throw new AccessDeniedException(
                        "Ce formateur ne suit pas cet apprenant pour cette formation."
                );
            }
        } else if (!"ADMIN".equals(actor.getRole())) {
            throw new AccessDeniedException("Acces interdit.");
        }

        return ResponseEntity.ok(
                analyticsService.getLearnerTrainingRiskIndicator(
                        learnerId,
                        trainingId
                )
        );
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

    private void requireSameLearner(
            AuthenticatedUser actor,
            Long learnerId
    ) {
        requireLearner(actor);

        if (!actor.getUserId().equals(learnerId)) {
            throw new AccessDeniedException(
                    "Un apprenant ne peut consulter que ses propres indicateurs."
            );
        }
    }
}