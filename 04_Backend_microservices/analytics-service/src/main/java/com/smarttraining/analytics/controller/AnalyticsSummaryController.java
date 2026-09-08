package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.LearnerAnalyticsSummaryResponse;
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
@RequestMapping("/analytics/summary")
public class AnalyticsSummaryController {

    private final AnalyticsService analyticsService;
    private final TrainerLearnerAccessGuard accessGuard;

    public AnalyticsSummaryController(
            AnalyticsService analyticsService,
            TrainerLearnerAccessGuard accessGuard
    ) {
        this.analyticsService = analyticsService;
        this.accessGuard = accessGuard;
    }

    @GetMapping("/learner/{learnerId}")
    public LearnerAnalyticsSummaryResponse getLearnerSummary(
            @PathVariable Long learnerId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor =
                AuthenticatedUser.from(authentication);

        // Self-service: an authenticated user may read their own learner data.
        if (actor.getUserId().equals(learnerId)) {
            return analyticsService.getLearnerSummary(learnerId);
        }

        // A learner must never select another learnerId.
        if ("APPRENANT".equals(actor.getRole())) {
            throw new AccessDeniedException(
                    "Un apprenant ne peut consulter que ses propres statistiques."
            );
        }

        // Admin keeps the existing global visibility.
        if ("ADMIN".equals(actor.getRole())) {
            return analyticsService.getLearnerSummary(learnerId);
        }

        // A trainer may only see the part of the learner summary that belongs
        // to trainings for which Training Service grants access.
        if ("FORMATEUR".equals(actor.getRole())) {
            List<Long> allowedTrainingIds =
                    accessGuard.requireAccess(actor, learnerId);

            return analyticsService.getLearnerSummaryForTrainings(
                    learnerId,
                    allowedTrainingIds
            );
        }

        throw new AccessDeniedException("Acces interdit.");
    }
}