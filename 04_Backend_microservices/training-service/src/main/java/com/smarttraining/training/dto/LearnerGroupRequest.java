package com.smarttraining.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LearnerGroupRequest {

    @NotBlank(message = "Le nom du groupe est obligatoire")
    @Size(
        max = 150,
        message = "Le nom du groupe ne doit pas depasser 150 caracteres"
    )
    private String name;

    @Size(
        max = 500,
        message = "La description ne doit pas depasser 500 caracteres"
    )
    private String description;

    public LearnerGroupRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
