package com.smarttraining.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ResetPasswordRequest {

    @NotBlank(message = "Le token est obligatoire")
    @Size(min = 32, max = 200, message = "Le token est invalide")
    private String token;

    @NotBlank(message = "Le nouveau mot de passe est obligatoire")
    @Size(
        min = 6,
        max = 100,
        message = "Le nouveau mot de passe doit contenir entre 6 et 100 caracteres"
    )
    private String newPassword;

    public ResetPasswordRequest() {
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token == null ? null : token.trim();
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}