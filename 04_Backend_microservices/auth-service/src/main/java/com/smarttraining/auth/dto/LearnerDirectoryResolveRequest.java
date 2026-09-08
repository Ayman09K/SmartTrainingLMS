package com.smarttraining.auth.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public class LearnerDirectoryResolveRequest {

    @NotEmpty(message = "La liste des apprenants est obligatoire")
    @Size(max = 200, message = "La résolution est limitée à 200 apprenants par requête")
    private List<@NotNull @Positive Long> learnerIds;

    public LearnerDirectoryResolveRequest() {
    }

    public List<Long> getLearnerIds() {
        return learnerIds;
    }

    public void setLearnerIds(List<Long> learnerIds) {
        this.learnerIds = learnerIds;
    }
}
