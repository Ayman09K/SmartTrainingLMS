package com.smarttraining.training.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class LearnerGroupTrainingAssignmentRequest {

    @NotNull(message = "L'identifiant de la formation est obligatoire")
    private Long trainingId;

    @Future(message = "L'echeance doit etre dans le futur")
    private LocalDateTime dueAt;

    public LearnerGroupTrainingAssignmentRequest() {
    }

    public Long getTrainingId() {
        return trainingId;
    }

    public void setTrainingId(Long trainingId) {
        this.trainingId = trainingId;
    }

    public LocalDateTime getDueAt() {
        return dueAt;
    }

    public void setDueAt(LocalDateTime dueAt) {
        this.dueAt = dueAt;
    }
}