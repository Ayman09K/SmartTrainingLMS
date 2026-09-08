package com.smarttraining.training.dto;

import com.smarttraining.training.enums.EnrollmentSource;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public class TrainingAssignmentRequest {

    @NotNull(message = "L'identifiant de la formation est obligatoire")
    private Long trainingId;

    @NotEmpty(message = "La liste des apprenants est obligatoire")
    private List<Long> learnerIds;

    private Long assignedBy;

    private EnrollmentSource source;

    @Future(message = "L'echeance doit etre dans le futur")
    private LocalDateTime dueAt;

    public TrainingAssignmentRequest() {
    }

    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }

    public List<Long> getLearnerIds() { return learnerIds; }
    public void setLearnerIds(List<Long> learnerIds) { this.learnerIds = learnerIds; }

    public Long getAssignedBy() { return assignedBy; }
    public void setAssignedBy(Long assignedBy) { this.assignedBy = assignedBy; }

    public EnrollmentSource getSource() { return source; }
    public void setSource(EnrollmentSource source) { this.source = source; }

    public LocalDateTime getDueAt() { return dueAt; }
    public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }
}
