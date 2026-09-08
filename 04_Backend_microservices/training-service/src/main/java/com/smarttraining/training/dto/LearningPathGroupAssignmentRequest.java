package com.smarttraining.training.dto;

import jakarta.validation.constraints.Future;
import java.time.LocalDateTime;

public class LearningPathGroupAssignmentRequest {

    @Future(message = "L'echeance doit etre dans le futur")
    private LocalDateTime dueAt;

    public LocalDateTime getDueAt() { return dueAt; }
    public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }
}