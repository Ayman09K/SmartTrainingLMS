package com.smarttraining.training.dto;

import com.smarttraining.training.entity.LearnerGroup;
import java.time.LocalDateTime;

public class LearnerGroupResponse {

    private Long id;
    private String name;
    private String description;
    private Long ownerId;
    private String ownerRole;
    private long memberCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public LearnerGroupResponse() {
    }

    public LearnerGroupResponse(
            LearnerGroup group,
            long memberCount
    ) {
        this.id = group.getId();
        this.name = group.getName();
        this.description = group.getDescription();
        this.ownerId = group.getOwnerId();
        this.ownerRole = group.getOwnerRole();
        this.memberCount = memberCount;
        this.createdAt = group.getCreatedAt();
        this.updatedAt = group.getUpdatedAt();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public String getOwnerRole() {
        return ownerRole;
    }

    public long getMemberCount() {
        return memberCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
