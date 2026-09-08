package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.FeedbackRequest;
import com.smarttraining.analytics.dto.FeedbackResponse;
import com.smarttraining.analytics.dto.FeedbackUpdateRequest;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.security.TrainerLearnerAccessGuard;
import com.smarttraining.analytics.service.ReviewFeedbackService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/analytics/feedbacks")
public class FeedbackController {

    private final ReviewFeedbackService reviewFeedbackService;
    private final TrainerLearnerAccessGuard accessGuard;

    public FeedbackController(
            ReviewFeedbackService reviewFeedbackService,
            TrainerLearnerAccessGuard accessGuard
    ) {
        this.reviewFeedbackService = reviewFeedbackService;
        this.accessGuard = accessGuard;
    }

    @PostMapping
    public FeedbackResponse createFeedback(
            @Valid @RequestBody FeedbackRequest request,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireLearner(actor);
        request.setLearnerId(actor.getUserId());
        return reviewFeedbackService.createFeedback(request);
    }

    @GetMapping("/me")
    public List<FeedbackResponse> getMyFeedbacks(
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireLearner(actor);
        return reviewFeedbackService.getFeedbacksByLearner(actor.getUserId());
    }

    @GetMapping("/learner/{learnerId}")
    public List<FeedbackResponse> getFeedbacksByLearner(
            @PathVariable Long learnerId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);

        if (actor.getUserId().equals(learnerId)) {
            return reviewFeedbackService.getFeedbacksByLearner(learnerId);
        }

        if ("APPRENANT".equals(actor.getRole())) {
            throw new AccessDeniedException(
                    "Un apprenant ne peut consulter que ses propres feedbacks."
            );
        }

        if ("ADMIN".equals(actor.getRole())) {
            return reviewFeedbackService.getFeedbacksByLearner(learnerId);
        }

        List<Long> allowedTrainingIds =
                accessGuard.requireAccess(actor, learnerId);

        return reviewFeedbackService.getFeedbacksByLearner(learnerId)
                .stream()
                .filter(item ->
                        item.getTrainingId() != null
                        && allowedTrainingIds.contains(item.getTrainingId())
                )
                .toList();
    }

    @GetMapping("/training/{trainingId}")
    public List<FeedbackResponse> getFeedbacksByTraining(
            @PathVariable Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireEducator(actor);

        List<FeedbackResponse> feedbacks =
                reviewFeedbackService.getFeedbacksByTraining(trainingId);

        if ("ADMIN".equals(actor.getRole())) {
            return feedbacks;
        }

        return feedbacks.stream()
                .filter(item -> canTrainerAccess(actor, item))
                .toList();
    }

    @GetMapping("/open")
    public List<FeedbackResponse> getOpenFeedbacks(
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireEducator(actor);

        List<FeedbackResponse> feedbacks =
                reviewFeedbackService.getOpenFeedbacks();

        if ("ADMIN".equals(actor.getRole())) {
            return feedbacks;
        }

        return feedbacks.stream()
                .filter(item -> canTrainerAccess(actor, item))
                .toList();
    }

    @PutMapping("/{feedbackId}/me")
    public FeedbackResponse updateMyFeedback(
            @PathVariable Long feedbackId,
            @RequestBody FeedbackUpdateRequest request,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireLearner(actor);

        return reviewFeedbackService.updateOwnOpenFeedback(
                feedbackId,
                actor.getUserId(),
                request
        );
    }

    @PutMapping("/{feedbackId}/in-progress")
    public FeedbackResponse markInProgress(
            @PathVariable Long feedbackId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        FeedbackResponse feedback =
                reviewFeedbackService.getFeedbackById(feedbackId);

        requireCanHandle(actor, feedback);

        return reviewFeedbackService.markInProgress(
                feedbackId,
                actor.getUserId()
        );
    }

    @PutMapping("/{feedbackId}/resolve")
    public FeedbackResponse resolveFeedback(
            @PathVariable Long feedbackId,
            @RequestParam(required = false) String trainerResponse,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        FeedbackResponse feedback =
                reviewFeedbackService.getFeedbackById(feedbackId);

        requireCanHandle(actor, feedback);

        return reviewFeedbackService.resolveFeedback(
                feedbackId,
                actor.getUserId(),
                trainerResponse
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

    private void requireEducator(AuthenticatedUser actor) {
        if (actor == null || !actor.isEducator()) {
            throw new AccessDeniedException(
                    "Acces reserve a un formateur ou administrateur."
            );
        }
    }

    private void requireCanHandle(
            AuthenticatedUser actor,
            FeedbackResponse feedback
    ) {
        requireEducator(actor);

        if ("ADMIN".equals(actor.getRole())) {
            return;
        }

        if (!canTrainerAccess(actor, feedback)) {
            throw new AccessDeniedException(
                    "Ce feedback n'appartient pas au perimetre de ce formateur."
            );
        }
    }

    private boolean canTrainerAccess(
            AuthenticatedUser actor,
            FeedbackResponse feedback
    ) {
        try {
            List<Long> allowedTrainingIds =
                    accessGuard.requireAccess(
                            actor,
                            feedback.getLearnerId()
                    );

            return feedback.getTrainingId() != null
                    && allowedTrainingIds.contains(feedback.getTrainingId());
        } catch (AccessDeniedException exception) {
            return false;
        }
    }
}
