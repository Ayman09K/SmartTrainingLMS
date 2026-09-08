package com.smarttraining.auth.dto;

import com.smarttraining.auth.entity.AccountDeletionRequest;
import com.smarttraining.auth.enums.AccountDeletionRequestStatus;
import java.time.LocalDateTime;

public class AccountDeletionAdminResponse {

    private final Long id;
    private final Long userId;
    private final String requesterName;
    private final String email;
    private final String role;
    private final AccountDeletionRequestStatus status;
    private final LocalDateTime requestedAt;
    private final LocalDateTime processingStartedAt;
    private final LocalDateTime updatedAt;
    private final LocalDateTime processedAt;
    private final String adminComment;
    private final String handledByEmail;

    public AccountDeletionAdminResponse(AccountDeletionRequest request) {
        this.id = request.getId();
        this.userId = request.getUserId();
        this.requesterName =
                request.getRequesterNameSnapshot() == null
                || request.getRequesterNameSnapshot().isBlank()
                    ? request.getEmailSnapshot()
                    : request.getRequesterNameSnapshot();
        this.email = request.getEmailSnapshot();
        this.role = request.getRoleSnapshot();
        this.status = request.getStatus();
        this.requestedAt = request.getRequestedAt();
        this.processingStartedAt = request.getProcessingStartedAt();
        this.updatedAt = request.getUpdatedAt();
        this.processedAt = request.getProcessedAt();
        this.adminComment = request.getAdminComment();
        this.handledByEmail = request.getHandledByEmailSnapshot();
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getRequesterName() { return requesterName; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public AccountDeletionRequestStatus getStatus() { return status; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public LocalDateTime getProcessingStartedAt() { return processingStartedAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getProcessedAt() { return processedAt; }
    public String getAdminComment() { return adminComment; }
    public String getHandledByEmail() { return handledByEmail; }
}
