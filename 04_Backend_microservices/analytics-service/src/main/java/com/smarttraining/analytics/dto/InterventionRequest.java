package com.smarttraining.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import com.smarttraining.analytics.enums.ActionSource;
import com.smarttraining.analytics.enums.InterventionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class InterventionRequest {
    @NotNull(message = "learnerId est obligatoire")
    @Positive(message = "learnerId doit être positif")
    private Long learnerId;

    // Champ interne : jamais accepte comme identite de confiance depuis le client.
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)

private Long trainerId;

    @NotNull(message = "trainingId est obligatoire")
    @Positive(message = "trainingId doit être positif")
    private Long trainingId;

    @NotNull(message = "interventionType est obligatoire")
    private InterventionType interventionType;

    @NotBlank(message = "note est obligatoire")
    private String note;

    private ActionSource source = ActionSource.MANUAL;

    public InterventionRequest() {
    }

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }
    public Long getTrainerId() { return trainerId; }
    public void setTrainerId(Long trainerId) { this.trainerId = trainerId; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public InterventionType getInterventionType() { return interventionType; }
    public void setInterventionType(InterventionType interventionType) { this.interventionType = interventionType; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public ActionSource getSource() { return source; }
    public void setSource(ActionSource source) { this.source = source; }
}
