package com.smarttraining.analytics.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public class SupportSessionRequest {

    @NotNull(message = "learnerId est obligatoire")
    @Positive(message = "learnerId doit etre positif")
    private Long learnerId;

    @NotNull(message = "trainingId est obligatoire")
    @Positive(message = "trainingId doit etre positif")
    private Long trainingId;

    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 200, message = "Le titre ne doit pas depasser 200 caracteres")
    private String title;

    @NotBlank(message = "L'objectif est obligatoire")
    @Size(max = 1500, message = "L'objectif ne doit pas depasser 1500 caracteres")
    private String objective;

    @NotNull(message = "La date de seance est obligatoire")
    @Future(message = "La seance doit etre planifiee dans le futur")
    private LocalDateTime scheduledAt;

    @NotBlank(message = "Le lien de reunion est obligatoire")
    @Size(max = 1000, message = "Le lien ne doit pas depasser 1000 caracteres")
    @Pattern(
        regexp = "^https?://\\S+$",
        message = "Le lien de reunion doit commencer par http:// ou https://"
    )
    private String meetingLink;

    @Size(max = 2000, message = "La note ne doit pas depasser 2000 caracteres")
    private String note;

    public SupportSessionRequest() {
    }

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getObjective() { return objective; }
    public void setObjective(String objective) { this.objective = objective; }
    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }
    public String getMeetingLink() { return meetingLink; }
    public void setMeetingLink(String meetingLink) { this.meetingLink = meetingLink; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
