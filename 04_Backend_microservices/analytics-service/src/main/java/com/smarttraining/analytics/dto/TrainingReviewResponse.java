package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.entity.TrainingReview;
import com.smarttraining.analytics.enums.ReviewStatus;
import java.time.LocalDateTime;

public class TrainingReviewResponse {

    private Long id;
    private Long learnerId;
    private Long trainingId;
    private Integer rating;
    private String comment;
    private ReviewStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public TrainingReviewResponse() {
    }

    public TrainingReviewResponse(TrainingReview review) {
        this.id = review.getId();
        this.learnerId = review.getLearnerId();
        this.trainingId = review.getTrainingId();
        this.rating = review.getRating();
        this.comment = review.getComment();
        this.status = review.getStatus();
        this.createdAt = review.getCreatedAt();
        this.updatedAt = review.getUpdatedAt();
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public Integer getRating() { return rating; }
    public String getComment() { return comment; }
    public ReviewStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
