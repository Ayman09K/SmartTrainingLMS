package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.RecommendationResponse;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.security.TrainerLearnerAccessGuard;
import com.smarttraining.analytics.service.LearningRecommendationService;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/analytics/recommendations")
public class LearningRecommendationController {

    private final LearningRecommendationService learningRecommendationService;
    private final TrainerLearnerAccessGuard accessGuard;

    public LearningRecommendationController(
            LearningRecommendationService learningRecommendationService,
            TrainerLearnerAccessGuard accessGuard
    ) {
        this.learningRecommendationService = learningRecommendationService;
        this.accessGuard = accessGuard;
    }

    @PostMapping("/generate/learner/{learnerId}/training/{trainingId}")
    public List<RecommendationResponse> generateRecommendationsForLearnerTraining(
            @PathVariable Long learnerId,
            @PathVariable Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireEducatorTrainingAccess(actor, learnerId, trainingId);

        return learningRecommendationService
                .generateRecommendationsForLearnerTraining(
                        learnerId,
                        trainingId
                );
    }

    @GetMapping("/me")
    public List<RecommendationResponse> getMyRecommendations(
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireLearner(actor);

        return learningRecommendationService
                .getRecommendationsByLearner(actor.getUserId());
    }

    @GetMapping("/learner/{learnerId}")
    public List<RecommendationResponse> getRecommendationsByLearner(
            @PathVariable Long learnerId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);

        if (actor.getUserId().equals(learnerId)) {
            return learningRecommendationService
                    .getRecommendationsByLearner(learnerId);
        }

        if ("APPRENANT".equals(actor.getRole())) {
            throw new AccessDeniedException(
                    "Un apprenant ne peut consulter que ses propres recommandations."
            );
        }

        if ("ADMIN".equals(actor.getRole())) {
            return learningRecommendationService
                    .getRecommendationsByLearner(learnerId);
        }

        List<Long> allowedTrainingIds =
                accessGuard.requireAccess(actor, learnerId);

        return learningRecommendationService
                .getRecommendationsByLearner(learnerId)
                .stream()
                .filter(item ->
                        item.getTrainingId() != null
                        && allowedTrainingIds.contains(item.getTrainingId())
                )
                .toList();
    }

    @GetMapping("/training/{trainingId}")
    public List<RecommendationResponse> getRecommendationsByTraining(
            @PathVariable Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireEducator(actor);

        List<RecommendationResponse> recommendations =
                learningRecommendationService
                        .getRecommendationsByTraining(trainingId);

        if ("ADMIN".equals(actor.getRole())) {
            return recommendations;
        }

        return recommendations.stream()
                .filter(item -> canTrainerAccess(actor, item))
                .toList();
    }

    @GetMapping("/{recommendationId}")
    public RecommendationResponse getRecommendationById(
            @PathVariable Long recommendationId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        RecommendationResponse recommendation =
                learningRecommendationService
                        .getRecommendationById(recommendationId);

        requireReadAccess(actor, recommendation);
        return recommendation;
    }

    @PutMapping("/{recommendationId}/accept")
    public RecommendationResponse acceptRecommendation(
            @PathVariable Long recommendationId,
            JwtAuthenticationToken authentication
    ) {
        RecommendationResponse recommendation =
                learningRecommendationService
                        .getRecommendationById(recommendationId);

        requireOwnerOrAdmin(
                AuthenticatedUser.from(authentication),
                recommendation
        );

        return learningRecommendationService
                .acceptRecommendation(recommendationId);
    }

    @PutMapping("/{recommendationId}/complete")
    public RecommendationResponse completeRecommendation(
            @PathVariable Long recommendationId,
            JwtAuthenticationToken authentication
    ) {
        RecommendationResponse recommendation =
                learningRecommendationService
                        .getRecommendationById(recommendationId);

        requireOwnerOrAdmin(
                AuthenticatedUser.from(authentication),
                recommendation
        );

        return learningRecommendationService
                .completeRecommendation(recommendationId);
    }

    @PutMapping("/{recommendationId}/dismiss")
    public RecommendationResponse dismissRecommendation(
            @PathVariable Long recommendationId,
            JwtAuthenticationToken authentication
    ) {
        RecommendationResponse recommendation =
                learningRecommendationService
                        .getRecommendationById(recommendationId);

        requireOwnerOrAdmin(
                AuthenticatedUser.from(authentication),
                recommendation
        );

        return learningRecommendationService
                .dismissRecommendation(recommendationId);
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
                    "Cette recommandation n'appartient pas au perimetre de ce formateur."
            );
        }
    }

    private void requireReadAccess(
            AuthenticatedUser actor,
            RecommendationResponse recommendation
    ) {
        if (actor.getUserId().equals(recommendation.getLearnerId())) {
            return;
        }

        if ("APPRENANT".equals(actor.getRole())) {
            throw new AccessDeniedException(
                    "Cette recommandation appartient a un autre apprenant."
            );
        }

        requireEducatorTrainingAccess(
                actor,
                recommendation.getLearnerId(),
                recommendation.getTrainingId()
        );
    }

    private void requireOwnerOrAdmin(
            AuthenticatedUser actor,
            RecommendationResponse recommendation
    ) {
        if (actor.getUserId().equals(recommendation.getLearnerId())) {
            return;
        }

        if ("ADMIN".equals(actor.getRole())) {
            return;
        }

        throw new AccessDeniedException(
                "Seul l'utilisateur concerne ou un administrateur peut modifier cette recommandation."
        );
    }

    private boolean canTrainerAccess(
            AuthenticatedUser actor,
            RecommendationResponse recommendation
    ) {
        try {
            requireEducatorTrainingAccess(
                    actor,
                    recommendation.getLearnerId(),
                    recommendation.getTrainingId()
            );
            return true;
        } catch (AccessDeniedException exception) {
            return false;
        }
    }
}
