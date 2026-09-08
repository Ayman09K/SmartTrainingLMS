package com.smarttraining.auth.dto;

import com.smarttraining.auth.entity.AccountDeletionRequest;
import com.smarttraining.auth.enums.AccountDeletionRequestStatus;
import java.time.LocalDateTime;

public class AccountDeletionRequestResponse {

    private final Long id;
    private final AccountDeletionRequestStatus status;
    private final LocalDateTime requestedAt;
    private final LocalDateTime processingStartedAt;
    private final LocalDateTime updatedAt;
    private final LocalDateTime processedAt;
    private final String adminComment;
    private final boolean active;

    public AccountDeletionRequestResponse(AccountDeletionRequest request) {
        this.id = request.getId();
        this.status = request.getStatus();
        this.requestedAt = request.getRequestedAt();
        this.processingStartedAt = request.getProcessingStartedAt();
        this.updatedAt = request.getUpdatedAt();
        this.processedAt = request.getProcessedAt();
        this.adminComment = request.getAdminComment();
        this.active =
                request.getStatus() == AccountDeletionRequestStatus.PENDING
                || request.getStatus() == AccountDeletionRequestStatus.IN_PROGRESS;
    }

    public Long getId() { return id; }
    public AccountDeletionRequestStatus getStatus() { return status; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public LocalDateTime getProcessingStartedAt() { return processingStartedAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getProcessedAt() { return processedAt; }
    public String getAdminComment() { return adminComment; }
    public boolean isActive() { return active; }
}
