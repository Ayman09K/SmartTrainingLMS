package com.smarttraining.training.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public class LearningPathLearnerAssignmentRequest {

    @NotEmpty(message = "Au moins un apprenant est requis")
    @Size(max = 200, message = "Maximum 200 apprenants par affectation")
    private List<
            @Valid
            @NotNull(message = "Identifiant apprenant obligatoire")
            @Positive(message = "Identifiant apprenant invalide")
            Long
    > learnerIds;

    @Future(message = "L'echeance doit etre dans le futur")
    private LocalDateTime dueAt;

    public List<Long> getLearnerIds() { return learnerIds; }
    public void setLearnerIds(List<Long> learnerIds) {
        this.learnerIds = learnerIds;
    }

    public LocalDateTime getDueAt() { return dueAt; }
    public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }
}