package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.LearnerAiRiskResponse;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.security.TrainerLearnerAccessGuard;
import com.smarttraining.analytics.service.AnalyticsService;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics/ai-risk")
public class AiRiskController {

    private final AnalyticsService analyticsService;
    private final TrainerLearnerAccessGuard accessGuard;

    public AiRiskController(
            AnalyticsService analyticsService,
            TrainerLearnerAccessGuard accessGuard
    ) {
        this.analyticsService = analyticsService;
        this.accessGuard = accessGuard;
    }

    @GetMapping("/learner/{learnerId}/training/{trainingId}")
    public LearnerAiRiskResponse predictLearnerRiskWithAi(
            @PathVariable Long learnerId,
            @PathVariable Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor =
                AuthenticatedUser.from(authentication);

        if (actor.getUserId().equals(learnerId)) {
            return analyticsService.predictLearnerRiskWithAi(
                    learnerId,
                    trainingId
            );
        }

        if ("APPRENANT".equals(actor.getRole())) {
            throw new AccessDeniedException(
                    "Un apprenant ne peut consulter que ses propres indicateurs IA."
            );
        }

        if ("FORMATEUR".equals(actor.getRole())) {
            List<Long> allowedTrainingIds =
                    accessGuard.requireAccess(actor, learnerId);

            if (!allowedTrainingIds.contains(trainingId)) {
                throw new AccessDeniedException(
                        "Ce formateur ne suit pas cet apprenant pour cette formation."
                );
            }
        } else if (!"ADMIN".equals(actor.getRole())) {
            throw new AccessDeniedException("AccÃ¨s interdit.");
        }

        return analyticsService.predictLearnerRiskWithAi(
                learnerId,
                trainingId
        );
    }
}