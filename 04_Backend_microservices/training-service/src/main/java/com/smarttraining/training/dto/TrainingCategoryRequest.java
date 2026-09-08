package com.smarttraining.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public class TrainingCategoryRequest {

    @NotBlank(message = "Le nom de la categorie est obligatoire")
    private String name;

    private Boolean active;

    @PositiveOrZero(message = "L'ordre doit etre positif ou nul")
    private Integer sortOrder;

    public TrainingCategoryRequest() {
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}