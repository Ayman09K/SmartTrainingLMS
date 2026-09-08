package com.smarttraining.auth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AccountDeletionCompleteRequest {

    @NotBlank
    @Size(max = 1000)
    private String adminComment;

    @AssertTrue(
        message = "La confirmation du traitement reel des donnees est obligatoire."
    )
    private Boolean processingConfirmed;

    public String getAdminComment() {
        return adminComment;
    }

    public void setAdminComment(String adminComment) {
        this.adminComment = adminComment;
    }

    public Boolean getProcessingConfirmed() {
        return processingConfirmed;
    }

    public void setProcessingConfirmed(Boolean processingConfirmed) {
        this.processingConfirmed = processingConfirmed;
    }
}
