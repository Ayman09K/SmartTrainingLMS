package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.LearningEventResponse;
import com.smarttraining.analytics.dto.SelfLearningEventRequest;
import com.smarttraining.analytics.enums.LearningEventType;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.security.TrainerLearnerAccessGuard;
import com.smarttraining.analytics.service.AnalyticsService;
import com.smarttraining.analytics.service.AuthoritativeAnalyticsService;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics/events")
public class LearningEventController {

    private final AnalyticsService analyticsService;
    private final AuthoritativeAnalyticsService authoritativeAnalyticsService;
    private final TrainerLearnerAccessGuard accessGuard;

    public LearningEventController(
        AnalyticsService analyticsService,
        AuthoritativeAnalyticsService authoritativeAnalyticsService,
        TrainerLearnerAccessGuard accessGuard
    ) {
        this.analyticsService = analyticsService;
        this.authoritativeAnalyticsService = authoritativeAnalyticsService;
        this.accessGuard = accessGuard;
    }

    @PostMapping("/self")
    public LearningEventResponse createSelfEvent(
        @Valid @RequestBody SelfLearningEventRequest request,
        JwtAuthenticationToken authentication
    ) {
        return authoritativeAnalyticsService.recordSelfEvent(
            request,
            AuthenticatedUser.from(authentication)
        );
    }

    @GetMapping("/me")
    public List<LearningEventResponse> getMyEvents(
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        return analyticsService.getEventsByLearner(actor.getUserId());
    }

    @GetMapping("/me/training/{trainingId}")
    public List<LearningEventResponse> getMyTrainingEvents(
        @PathVariable Long trainingId,
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        return analyticsService.getEventsByLearnerAndTraining(
            actor.getUserId(),
            trainingId
        );
    }

    @GetMapping
    public List<LearningEventResponse> getAllEvents(
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = requireEducator(authentication);
        return filterEducatorScope(
            analyticsService.getAllEvents(),
            actor
        );
    }

    @GetMapping("/learner/{learnerId}")
    public List<LearningEventResponse> getEventsByLearner(
        @PathVariable Long learnerId,
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        List<LearningEventResponse> items =
            analyticsService.getEventsByLearner(learnerId);

        return filterLearnerReadScope(
            items,
            learnerId,
            actor
        );
    }

    @GetMapping("/training/{trainingId}")
    public List<LearningEventResponse> getEventsByTraining(
        @PathVariable Long trainingId,
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = requireEducator(authentication);
        return filterEducatorScope(
            analyticsService.getEventsByTraining(trainingId),
            actor
        );
    }

    @GetMapping("/learner/{learnerId}/training/{trainingId}")
    public List<LearningEventResponse> getEventsByLearnerAndTraining(
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

        return analyticsService.getEventsByLearnerAndTraining(
            learnerId,
            trainingId
        );
    }

    @GetMapping("/learner/{learnerId}/type/{eventType}")
    public List<LearningEventResponse> getEventsByLearnerAndType(
        @PathVariable Long learnerId,
        @PathVariable LearningEventType eventType,
        JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        List<LearningEventResponse> items =
            analyticsService.getEventsByLearnerAndType(
                learnerId,
                eventType
            );

        return filterLearnerReadScope(
            items,
            learnerId,
            actor
        );
    }

    private List<LearningEventResponse> filterLearnerReadScope(
        List<LearningEventResponse> items,
        Long learnerId,
        AuthenticatedUser actor
    ) {
        if (actor.getUserId().equals(learnerId)
                || "ADMIN".equals(actor.getRole())) {
            return items;
        }

        if (!"FORMATEUR".equals(actor.getRole())) {
            throw new AccessDeniedException(
                "Acces aux evenements de cet apprenant interdit."
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
                "Acces aux evenements de cet apprenant interdit."
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

    private List<LearningEventResponse> filterEducatorScope(
        List<LearningEventResponse> items,
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