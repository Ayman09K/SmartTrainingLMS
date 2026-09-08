package com.smarttraining.auth.entity;

import com.smarttraining.auth.enums.AccountDeletionRequestStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "account_deletion_requests",
    indexes = {
        @Index(name = "idx_account_deletion_user_requested", columnList = "user_id,requested_at"),
        @Index(name = "idx_account_deletion_status", columnList = "status")
    }
)
public class AccountDeletionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Scalar volontairement sans FK vers users :
     * la trace de la demande doit pouvoir survivre a un futur effacement
     * ou a une anonymisation de la ligne utilisateur.
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "email_snapshot", nullable = false, length = 150)
    private String emailSnapshot;

    @Column(name = "role_snapshot", nullable = false, length = 30)
    private String roleSnapshot;

    @Column(name = "requester_name_snapshot", length = 180)
    private String requesterNameSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AccountDeletionRequestStatus status = AccountDeletionRequestStatus.PENDING;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt = LocalDateTime.now();

    @Column(name = "processing_started_at")
    private LocalDateTime processingStartedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "admin_comment", length = 1000)
    private String adminComment;

    /*
     * Scalars sans FK : la trace de l'administrateur reste lisible meme si
     * son compte est ensuite supprime ou anonymise.
     */
    @Column(name = "handled_by_user_id")
    private Long handledByUserId;

    @Column(name = "handled_by_email_snapshot", length = 150)
    private String handledByEmailSnapshot;

    public AccountDeletionRequest() {
    }

    public AccountDeletionRequest(
            Long userId,
            String emailSnapshot,
            String roleSnapshot,
            String requesterNameSnapshot
    ) {
        this.userId = userId;
        this.emailSnapshot = emailSnapshot;
        this.roleSnapshot = roleSnapshot;
        this.requesterNameSnapshot = requesterNameSnapshot;
        this.status = AccountDeletionRequestStatus.PENDING;
        this.requestedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getEmailSnapshot() { return emailSnapshot; }
    public String getRoleSnapshot() { return roleSnapshot; }
    public String getRequesterNameSnapshot() { return requesterNameSnapshot; }
    public AccountDeletionRequestStatus getStatus() { return status; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public LocalDateTime getProcessingStartedAt() { return processingStartedAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getProcessedAt() { return processedAt; }
    public String getAdminComment() { return adminComment; }
    public Long getHandledByUserId() { return handledByUserId; }
    public String getHandledByEmailSnapshot() { return handledByEmailSnapshot; }

    public void setStatus(AccountDeletionRequestStatus status) { this.status = status; }
    public void setProcessingStartedAt(LocalDateTime processingStartedAt) {
        this.processingStartedAt = processingStartedAt;
    }
    public void setProcessedAt(LocalDateTime processedAt) { this.processedAt = processedAt; }
    public void setAdminComment(String adminComment) { this.adminComment = adminComment; }
    public void setHandledByUserId(Long handledByUserId) {
        this.handledByUserId = handledByUserId;
    }
    public void setHandledByEmailSnapshot(String handledByEmailSnapshot) {
        this.handledByEmailSnapshot = handledByEmailSnapshot;
    }
}
