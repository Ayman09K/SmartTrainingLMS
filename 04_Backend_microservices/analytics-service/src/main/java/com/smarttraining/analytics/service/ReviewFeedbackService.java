package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.FeedbackRequest;
import com.smarttraining.analytics.dto.FeedbackResponse;
import com.smarttraining.analytics.dto.FeedbackUpdateRequest;
import com.smarttraining.analytics.dto.TrainingReviewRequest;
import com.smarttraining.analytics.dto.TrainingReviewResponse;
import com.smarttraining.analytics.entity.Feedback;
import com.smarttraining.analytics.entity.TrainingReview;
import com.smarttraining.analytics.enums.DifficultyLevel;
import com.smarttraining.analytics.enums.FeedbackStatus;
import com.smarttraining.analytics.enums.ReviewStatus;
import com.smarttraining.analytics.repository.FeedbackRepository;
import com.smarttraining.analytics.repository.TrainingReviewRepository;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ReviewFeedbackService {

    private final TrainingReviewRepository reviewRepository;
    private final FeedbackRepository feedbackRepository;
    private final LearnerNotificationService notificationService;

    public ReviewFeedbackService(
            TrainingReviewRepository reviewRepository,
            FeedbackRepository feedbackRepository,
            LearnerNotificationService notificationService
    ) {
        this.reviewRepository = reviewRepository;
        this.feedbackRepository = feedbackRepository;
        this.notificationService = notificationService;
    }
    public TrainingReviewResponse createOrUpdateReview(TrainingReviewRequest request) {
        TrainingReview review = reviewRepository
                .findByLearnerIdAndTrainingId(request.getLearnerId(), request.getTrainingId())
                .orElseGet(TrainingReview::new);

        review.setLearnerId(request.getLearnerId());
        review.setTrainingId(request.getTrainingId());
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        review.setStatus(ReviewStatus.PUBLISHED);

        return new TrainingReviewResponse(reviewRepository.save(review));
    }

    @Transactional(readOnly = true)
    public List<TrainingReviewResponse> getReviewsByTraining(Long trainingId) {
        return reviewRepository
                .findByTrainingIdAndStatusOrderByCreatedAtDesc(
                        trainingId,
                        ReviewStatus.PUBLISHED
                )
                .stream()
                .map(TrainingReviewResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrainingReviewResponse> getAllReviewsByTrainingForAdmin(Long trainingId) {
        return reviewRepository.findByTrainingIdOrderByCreatedAtDesc(trainingId)
                .stream()
                .map(TrainingReviewResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrainingReviewResponse> getReviewsByLearner(Long learnerId) {
        return reviewRepository.findByLearnerIdOrderByCreatedAtDesc(learnerId)
                .stream()
                .map(TrainingReviewResponse::new)
                .toList();
    }

    public TrainingReviewResponse hideReview(Long reviewId) {
        TrainingReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Avis introuvable"));

        review.setStatus(ReviewStatus.HIDDEN);
        return new TrainingReviewResponse(reviewRepository.save(review));
    }

    public TrainingReviewResponse publishReview(Long reviewId) {
        TrainingReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Avis introuvable"));

        review.setStatus(ReviewStatus.PUBLISHED);
        return new TrainingReviewResponse(reviewRepository.save(review));
    }

    public FeedbackResponse createFeedback(FeedbackRequest request) {
        Feedback feedback = new Feedback();
        feedback.setLearnerId(request.getLearnerId());
        feedback.setTrainingId(request.getTrainingId());
        feedback.setModuleId(request.getModuleId());
        feedback.setLessonId(request.getLessonId());
        feedback.setResourceId(request.getResourceId());
        feedback.setDifficultyLevel(
                request.getDifficultyLevel() == null
                        ? DifficultyLevel.NORMAL
                        : request.getDifficultyLevel()
        );
        feedback.setNeedHelp(
                request.getNeedHelp() == null
                        ? Boolean.FALSE
                        : request.getNeedHelp()
        );
        feedback.setMessage(request.getMessage());
        feedback.setStatus(FeedbackStatus.OPEN);

        return new FeedbackResponse(feedbackRepository.save(feedback));
    }

    @Transactional(readOnly = true)
    public FeedbackResponse getFeedbackById(Long feedbackId) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Feedback introuvable avec id=" + feedbackId
                        )
                );

        return new FeedbackResponse(feedback);
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> getFeedbacksByLearner(Long learnerId) {
        return feedbackRepository.findByLearnerIdOrderByCreatedAtDesc(learnerId)
                .stream()
                .map(FeedbackResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> getFeedbacksByTraining(Long trainingId) {
        return feedbackRepository.findByTrainingIdOrderByCreatedAtDesc(trainingId)
                .stream()
                .map(FeedbackResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> getOpenFeedbacks() {
        return feedbackRepository.findByStatusOrderByCreatedAtDesc(FeedbackStatus.OPEN)
                .stream()
                .map(FeedbackResponse::new)
                .toList();
    }

    public FeedbackResponse updateOwnOpenFeedback(
            Long feedbackId,
            Long learnerId,
            FeedbackUpdateRequest request
    ) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new IllegalArgumentException("Feedback introuvable"));

        if (!learnerId.equals(feedback.getLearnerId())) {
            throw new AccessDeniedException(
                    "Un apprenant ne peut modifier que ses propres retours."
            );
        }

        if (feedback.getStatus() != FeedbackStatus.OPEN) {
            throw new IllegalArgumentException(
                    "Ce retour ne peut plus etre modifie car il est deja pris en charge."
            );
        }

        feedback.setDifficultyLevel(
                request.getDifficultyLevel() == null
                        ? DifficultyLevel.NORMAL
                        : request.getDifficultyLevel()
        );
        feedback.setNeedHelp(
                request.getNeedHelp() == null
                        ? Boolean.FALSE
                        : request.getNeedHelp()
        );
        feedback.setMessage(request.getMessage());

        return new FeedbackResponse(feedbackRepository.save(feedback));
    }

    public FeedbackResponse markInProgress(
            Long feedbackId,
            Long handledBy
    ) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new IllegalArgumentException("Feedback introuvable"));

        feedback.setStatus(FeedbackStatus.IN_PROGRESS);
        feedback.setHandledBy(handledBy);

        return new FeedbackResponse(feedbackRepository.save(feedback));
    }

    public FeedbackResponse resolveFeedback(
            Long feedbackId,
            Long handledBy,
            String trainerResponse
    ) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() ->
                    new IllegalArgumentException(
                        "Feedback introuvable"
                    )
                );

        feedback.markResolved(
            handledBy,
            trainerResponse
        );

        Feedback saved =
            feedbackRepository.save(feedback);

        notificationService.notifyFeedbackResponse(saved);

        return new FeedbackResponse(saved);
    }
}
