package com.smarttraining.training.dto;

import com.smarttraining.training.enums.TrainingVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LearningPathRequest {

    @NotBlank(message = "Le titre du parcours est obligatoire")
    @Size(max = 150, message = "Le titre du parcours ne peut pas depasser 150 caracteres")
    private String title;

    @Size(max = 500, message = "La description courte ne peut pas depasser 500 caracteres")
    private String shortDescription;

    @Size(max = 2000, message = "La description ne peut pas depasser 2000 caracteres")
    private String description;

    @Size(max = 2000, message = "Les objectifs ne peuvent pas depasser 2000 caracteres")
    private String objectives;

    @Size(max = 1500, message = "La note de version ne peut pas depasser 1500 caracteres")
    private String versionNote;

    private TrainingVisibility visibility;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
    }

    public String getDescription() { return description; }
    public void setDescription(String description) {
        this.description = description;
    }

    public String getObjectives() { return objectives; }
    public void setObjectives(String objectives) {
        this.objectives = objectives;
    }

    public String getVersionNote() { return versionNote; }
    public void setVersionNote(String versionNote) {
        this.versionNote = versionNote;
    }

    public TrainingVisibility getVisibility() { return visibility; }
    public void setVisibility(TrainingVisibility visibility) {
        this.visibility = visibility;
    }
}
