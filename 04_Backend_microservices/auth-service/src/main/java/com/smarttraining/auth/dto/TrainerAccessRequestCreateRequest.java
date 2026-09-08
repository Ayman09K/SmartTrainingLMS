package com.smarttraining.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class TrainerAccessRequestCreateRequest {

    @NotBlank(message = "Le domaine d'expertise est obligatoire")
    @Size(max = 120, message = "Le domaine d'expertise est trop long")
    private String expertiseDomain;

    @Size(max = 1000, message = "Le résumé d'expérience est trop long")
    private String experienceSummary;

    @NotBlank(message = "La motivation est obligatoire")
    @Size(max = 1500, message = "La motivation est trop longue")
    private String motivation;

    public TrainerAccessRequestCreateRequest() {
    }

    public String getExpertiseDomain() {
        return expertiseDomain;
    }

    public void setExpertiseDomain(String expertiseDomain) {
        this.expertiseDomain = expertiseDomain;
    }

    public String getExperienceSummary() {
        return experienceSummary;
    }

    public void setExperienceSummary(String experienceSummary) {
        this.experienceSummary = experienceSummary;
    }

    public String getMotivation() {
        return motivation;
    }

    public void setMotivation(String motivation) {
        this.motivation = motivation;
    }
}
