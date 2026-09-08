package com.smarttraining.auth.dto;

import com.smarttraining.auth.entity.TrainerAccessRequest;
import com.smarttraining.auth.enums.TrainerRequestStatus;
import java.time.LocalDateTime;

public class TrainerAccessRequestResponse {

    private Long id;
    private Long requesterId;
    private String requesterEmail;
    private String requesterFullName;
    private String expertiseDomain;
    private String experienceSummary;
    private String motivation;
    private TrainerRequestStatus status;
    private Long reviewerId;
    private String reviewerEmail;
    private String adminComment;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;

    public TrainerAccessRequestResponse() {
    }

    public TrainerAccessRequestResponse(TrainerAccessRequest request) {
        this.id = request.getId();
        this.requesterId = request.getRequester().getId();
        this.requesterEmail = request.getRequester().getEmail();
        this.requesterFullName = request.getRequester().getFullName();
        this.expertiseDomain = request.getExpertiseDomain();
        this.experienceSummary = request.getExperienceSummary();
        this.motivation = request.getMotivation();
        this.status = request.getStatus();
        this.adminComment = request.getAdminComment();
        this.requestedAt = request.getRequestedAt();
        this.reviewedAt = request.getReviewedAt();

        if (request.getReviewer() != null) {
            this.reviewerId = request.getReviewer().getId();
            this.reviewerEmail = request.getReviewer().getEmail();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getRequesterId() {
        return requesterId;
    }

    public String getRequesterEmail() {
        return requesterEmail;
    }

    public String getRequesterFullName() {
        return requesterFullName;
    }

    public String getExpertiseDomain() {
        return expertiseDomain;
    }

    public String getExperienceSummary() {
        return experienceSummary;
    }

    public String getMotivation() {
        return motivation;
    }

    public TrainerRequestStatus getStatus() {
        return status;
    }

    public Long getReviewerId() {
        return reviewerId;
    }

    public String getReviewerEmail() {
        return reviewerEmail;
    }

    public String getAdminComment() {
        return adminComment;
    }

    public LocalDateTime getRequestedAt() {
        return requestedAt;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }
}
