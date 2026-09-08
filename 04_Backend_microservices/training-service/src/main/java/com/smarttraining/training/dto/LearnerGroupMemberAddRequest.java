package com.smarttraining.training.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public class LearnerGroupMemberAddRequest {

    @NotEmpty(message = "Au moins un apprenant est requis")
    @Size(
        max = 200,
        message = "Maximum 200 apprenants par ajout"
    )
    private List<
            @Valid
            @NotNull(message = "Identifiant apprenant obligatoire")
            @Positive(message = "Identifiant apprenant invalide")
            Long
    > learnerIds;

    public LearnerGroupMemberAddRequest() {
    }

    public List<Long> getLearnerIds() {
        return learnerIds;
    }

    public void setLearnerIds(List<Long> learnerIds) {
        this.learnerIds = learnerIds;
    }
}
