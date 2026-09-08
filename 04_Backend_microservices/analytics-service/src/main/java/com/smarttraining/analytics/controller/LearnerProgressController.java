package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.LearnerProgressResponse;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.security.TrainerLearnerAccessGuard;
import com.smarttraining.analytics.service.AnalyticsService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/progress")
public class LearnerProgressController {

    private final AnalyticsService analyticsService;
    private final TrainerLearnerAccessGuard accessGuard;

    public LearnerProgressController(
        AnalyticsService analyticsService,
        TrainerLearnerAccessGuard accessGuard
    ) {
        this.analyticsService = analyticsService;
        this.accessGuard = accessGuard;
    }

    @GetMapping("/me")
    public List<LearnerProgressResponse> getMyProgress(
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        return analyticsService.getProgressByLearner(actor.getUserId());
    }

    @GetMapping("/me/training/{trainingId}")
    public LearnerProgressResponse getMyTrainingProgress(
        @PathVariable Long trainingId,
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        return analyticsService.getProgressByLearnerAndTraining(
            actor.getUserId(),
            trainingId
        );
    }

    @GetMapping
    public List<LearnerProgressResponse> getAllProgress(
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = requireEducator(authentication);
        return filterEducatorScope(
            analyticsService.getAllProgress(),
            actor
        );
    }

    @GetMapping("/learner/{learnerId}")
    public List<LearnerProgressResponse> getProgressByLearner(
        @PathVariable Long learnerId,
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        List<LearnerProgressResponse> items =
            analyticsService.getProgressByLearner(learnerId);

        return filterLearnerReadScope(
            items,
            learnerId,
            actor
        );
    }

    @GetMapping("/training/{trainingId}")
    public List<LearnerProgressResponse> getProgressByTraining(
        @PathVariable Long trainingId,
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = requireEducator(authentication);
        return filterEducatorScope(
            analyticsService.getProgressByTraining(trainingId),
            actor
        );
    }

    @GetMapping("/learner/{learnerId}/training/{trainingId}")
    public LearnerProgressResponse getProgressByLearnerAndTraining(
        @PathVariable Long learnerId,
        @PathVariable Long trainingId,
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireLearnerTrainingReadAccess(
            learnerId,
            trainingId,
            actor
        );

        return analyticsService.getProgressByLearnerAndTraining(
            learnerId,
            trainingId
        );
    }

    @GetMapping("/at-risk")
    public List<LearnerProgressResponse> getAtRiskProgress(
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = requireEducator(authentication);
        return filterEducatorScope(
            analyticsService.getAtRiskProgress(),
            actor
        );
    }

    private List<LearnerProgressResponse> filterLearnerReadScope(
        List<LearnerProgressResponse> items,
        Long learnerId,
        AuthenticatedUser actor
    ) {
        if (actor.getUserId().equals(learnerId)
                || "ADMIN".equals(actor.getRole())) {
            return items;
        }

        if (!"FORMATEUR".equals(actor.getRole())) {
            throw new AccessDeniedException(
                "Acces a la progression de cet apprenant interdit."
            );
        }

        Set<Long> allowedTrainingIds =
            Set.copyOf(accessGuard.requireAccess(actor, learnerId));

        return items.stream()
            .filter(item ->
                item.getTrainingId() != null
                    && allowedTrainingIds.contains(item.getTrainingId())
            )
            .toList();
    }

    private void requireLearnerTrainingReadAccess(
        Long learnerId,
        Long trainingId,
        AuthenticatedUser actor
    ) {
        if (actor.getUserId().equals(learnerId)
                || "ADMIN".equals(actor.getRole())) {
            return;
        }

        if (!"FORMATEUR".equals(actor.getRole())) {
            throw new AccessDeniedException(
                "Acces a la progression de cet apprenant interdit."
            );
        }

        List<Long> allowedTrainingIds =
            accessGuard.requireAccess(actor, learnerId);

        if (!allowedTrainingIds.contains(trainingId)) {
            throw new AccessDeniedException(
                "Cette formation n'appartient pas au perimetre de ce formateur."
            );
        }
    }

    private List<LearnerProgressResponse> filterEducatorScope(
        List<LearnerProgressResponse> items,
        AuthenticatedUser actor
    ) {
        if ("ADMIN".equals(actor.getRole())) {
            return items;
        }

        Map<Long, Set<Long>> allowedByLearner = new HashMap<>();

        return items.stream()
            .filter(item -> {
                if (item.getLearnerId() == null) {
                    return false;
                }

                if (actor.getUserId().equals(item.getLearnerId())) {
                    return true;
                }

                if (item.getTrainingId() == null) {
                    return false;
                }

                Set<Long> allowedTrainingIds =
                    allowedByLearner.computeIfAbsent(
                        item.getLearnerId(),
                        learnerId ->
                            allowedTrainingIdsOrEmpty(
                                actor,
                                learnerId
                            )
                    );

                return allowedTrainingIds.contains(
                    item.getTrainingId()
                );
            })
            .toList();
    }

    private Set<Long> allowedTrainingIdsOrEmpty(
        AuthenticatedUser actor,
        Long learnerId
    ) {
        try {
            return Set.copyOf(
                accessGuard.requireAccess(actor, learnerId)
            );
        } catch (AccessDeniedException exception) {
            return Set.of();
        }
    }

    private AuthenticatedUser requireEducator(
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor =
            AuthenticatedUser.from(authentication);

        if (!actor.isEducator()) {
            throw new AccessDeniedException(
                "Acces reserve a un formateur ou administrateur."
            );
        }

        return actor;
    }
}