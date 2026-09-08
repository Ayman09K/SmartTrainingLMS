package com.smarttraining.auth.entity;

import com.smarttraining.auth.enums.TrainerRequestStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "trainer_access_requests")
public class TrainerAccessRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @Column(nullable = false, length = 120)
    private String expertiseDomain;

    @Column(length = 1000)
    private String experienceSummary;

    @Column(nullable = false, length = 1500)
    private String motivation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TrainerRequestStatus status = TrainerRequestStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id")
    private User reviewer;

    @Column(length = 1000)
    private String adminComment;

    @Column(nullable = false)
    private LocalDateTime requestedAt = LocalDateTime.now();

    private LocalDateTime reviewedAt;

    public TrainerAccessRequest() {
    }

    public TrainerAccessRequest(User requester, String expertiseDomain, String experienceSummary, String motivation) {
        this.requester = requester;
        this.expertiseDomain = expertiseDomain;
        this.experienceSummary = experienceSummary;
        this.motivation = motivation;
        this.status = TrainerRequestStatus.PENDING;
        this.requestedAt = LocalDateTime.now();
    }

    public void approve(User reviewer, String adminComment) {
        this.status = TrainerRequestStatus.APPROVED;
        this.reviewer = reviewer;
        this.adminComment = adminComment;
        this.reviewedAt = LocalDateTime.now();
    }

    public void reject(User reviewer, String adminComment) {
        this.status = TrainerRequestStatus.REJECTED;
        this.reviewer = reviewer;
        this.adminComment = adminComment;
        this.reviewedAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = TrainerRequestStatus.CANCELLED;
        this.reviewedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getRequester() {
        return requester;
    }

    public void setRequester(User requester) {
        this.requester = requester;
    }

    public String getExpertiseDomain() {
        return expertiseDomain;
    }

    public void setExpertiseDomain(String expertiseDomain) {
        this.expertiseDomain = expertiseDomain;
    }

    public String getExperienceSummary() {
        return experienceSummary;
    }

    public void setExperienceSummary(String experienceSummary) {
        this.experienceSummary = experienceSummary;
    }

    public String getMotivation() {
        return motivation;
    }

    public void setMotivation(String motivation) {
        this.motivation = motivation;
    }

    public TrainerRequestStatus getStatus() {
        return status;
    }

    public void setStatus(TrainerRequestStatus status) {
        this.status = status;
    }

    public User getReviewer() {
        return reviewer;
    }

    public void setReviewer(User reviewer) {
        this.reviewer = reviewer;
    }

    public String getAdminComment() {
        return adminComment;
    }

    public void setAdminComment(String adminComment) {
        this.adminComment = adminComment;
    }

    public LocalDateTime getRequestedAt() {
        return requestedAt;
    }

    public void setRequestedAt(LocalDateTime requestedAt) {
        this.requestedAt = requestedAt;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }
}
