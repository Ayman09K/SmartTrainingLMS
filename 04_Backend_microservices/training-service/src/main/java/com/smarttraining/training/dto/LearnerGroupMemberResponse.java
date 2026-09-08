package com.smarttraining.training.dto;

import com.smarttraining.training.client.InternalLearnerDirectoryEntry;
import com.smarttraining.training.entity.LearnerGroupMember;
import java.time.LocalDateTime;

public class LearnerGroupMemberResponse {

    private Long id;
    private Long learnerId;
    private String fullName;
    private String email;
    private Long addedBy;
    private LocalDateTime addedAt;

    public LearnerGroupMemberResponse() {
    }

    public LearnerGroupMemberResponse(
            LearnerGroupMember member,
            InternalLearnerDirectoryEntry identity
    ) {
        this.id = member.getId();
        this.learnerId = member.getLearnerId();
        this.fullName =
                identity == null
                ? null
                : identity.getFullName();
        this.email =
                identity == null
                ? null
                : identity.getEmail();
        this.addedBy = member.getAddedBy();
        this.addedAt = member.getAddedAt();
    }

    public Long getId() {
        return id;
    }

    public Long getLearnerId() {
        return learnerId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public Long getAddedBy() {
        return addedBy;
    }

    public LocalDateTime getAddedAt() {
        return addedAt;
    }
}
