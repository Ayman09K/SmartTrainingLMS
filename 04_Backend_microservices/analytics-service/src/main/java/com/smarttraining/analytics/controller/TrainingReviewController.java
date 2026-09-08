package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.TrainingReviewRequest;
import com.smarttraining.analytics.dto.TrainingReviewResponse;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.service.ReviewFeedbackService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/analytics/reviews")
public class TrainingReviewController {

    private final ReviewFeedbackService reviewFeedbackService;

    public TrainingReviewController(
            ReviewFeedbackService reviewFeedbackService
    ) {
        this.reviewFeedbackService = reviewFeedbackService;
    }

    @PostMapping
    public TrainingReviewResponse createOrUpdateReview(
            @Valid @RequestBody TrainingReviewRequest request,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireLearner(actor);

        request.setLearnerId(actor.getUserId());
        return reviewFeedbackService.createOrUpdateReview(request);
    }

    @GetMapping("/training/{trainingId}")
    public List<TrainingReviewResponse> getReviewsByTraining(
            @PathVariable Long trainingId
    ) {
        return reviewFeedbackService.getReviewsByTraining(trainingId);
    }

    @GetMapping("/me")
    public List<TrainingReviewResponse> getMyReviews(
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);
        requireLearner(actor);

        return reviewFeedbackService.getReviewsByLearner(actor.getUserId());
    }

    @GetMapping("/learner/{learnerId}")
    public List<TrainingReviewResponse> getReviewsByLearner(
            @PathVariable Long learnerId,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor = AuthenticatedUser.from(authentication);

        if (actor.getUserId().equals(learnerId)) {
            return reviewFeedbackService.getReviewsByLearner(learnerId);
        }

        if ("APPRENANT".equals(actor.getRole())) {
            throw new AccessDeniedException(
                    "Un apprenant ne peut consulter que ses propres avis."
            );
        }

        requireAdmin(actor);
        return reviewFeedbackService.getReviewsByLearner(learnerId);
    }

    @GetMapping("/admin/training/{trainingId}")
    public List<TrainingReviewResponse> getAllReviewsByTrainingForAdmin(
            @PathVariable Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        requireAdmin(AuthenticatedUser.from(authentication));
        return reviewFeedbackService.getAllReviewsByTrainingForAdmin(trainingId);
    }

    @PutMapping("/{reviewId}/hide")
    public TrainingReviewResponse hideReview(
            @PathVariable Long reviewId,
            JwtAuthenticationToken authentication
    ) {
        requireAdmin(AuthenticatedUser.from(authentication));
        return reviewFeedbackService.hideReview(reviewId);
    }

    @PutMapping("/{reviewId}/publish")
    public TrainingReviewResponse publishReview(
            @PathVariable Long reviewId,
            JwtAuthenticationToken authentication
    ) {
        requireAdmin(AuthenticatedUser.from(authentication));
        return reviewFeedbackService.publishReview(reviewId);
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

    private void requireAdmin(AuthenticatedUser actor) {
        if (actor == null || !"ADMIN".equals(actor.getRole())) {
            throw new AccessDeniedException(
                "Cette action est reservee a l'administrateur."
            );
        }
    }
}