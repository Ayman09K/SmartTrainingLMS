package com.smarttraining.training.dto;

import com.smarttraining.training.entity.TrainingCategory;
import java.time.LocalDateTime;

public class TrainingCategoryResponse {

    private final Long id;
    private final String name;
    private final Boolean active;
    private final Integer sortOrder;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public TrainingCategoryResponse(TrainingCategory category) {
        this.id = category.getId();
        this.name = category.getName();
        this.active = category.getActive();
        this.sortOrder = category.getSortOrder();
        this.createdAt = category.getCreatedAt();
        this.updatedAt = category.getUpdatedAt();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public Boolean getActive() { return active; }
    public Integer getSortOrder() { return sortOrder; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}