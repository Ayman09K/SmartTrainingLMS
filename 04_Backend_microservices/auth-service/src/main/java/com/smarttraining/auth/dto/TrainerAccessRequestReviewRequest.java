package com.smarttraining.auth.dto;

import jakarta.validation.constraints.Size;

public class TrainerAccessRequestReviewRequest {

    @Size(max = 1000, message = "Le commentaire administrateur est trop long")
    private String adminComment;

    public TrainerAccessRequestReviewRequest() {
    }

    public String getAdminComment() {
        return adminComment;
    }

    public void setAdminComment(String adminComment) {
        this.adminComment = adminComment;
    }
}
