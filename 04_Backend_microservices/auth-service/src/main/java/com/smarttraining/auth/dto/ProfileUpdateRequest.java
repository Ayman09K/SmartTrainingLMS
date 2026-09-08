package com.smarttraining.auth.dto;

import com.smarttraining.auth.enums.Civilite;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ProfileUpdateRequest {

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(max = 80, message = "Le prénom est trop long")
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 80, message = "Le nom est trop long")
    private String lastName;

    @Email(message = "L'email est invalide")
    @NotBlank(message = "L'email est obligatoire")
    @Size(max = 150, message = "L'email est trop long")
    private String email;

    private Civilite civilite = Civilite.NON_RENSEIGNEE;

    @Size(
        max = 1500000,
        message = "La photo de profil est trop volumineuse"
    )
    private String avatarDataUrl;

    private String currentPassword;

    public ProfileUpdateRequest() {
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Civilite getCivilite() {
        return civilite;
    }

    public void setCivilite(Civilite civilite) {
        this.civilite = civilite;
    }

    public String getAvatarDataUrl() {
        return avatarDataUrl;
    }

    public void setAvatarDataUrl(String avatarDataUrl) {
        this.avatarDataUrl = avatarDataUrl;
    }

    public String getCurrentPassword() {
        return currentPassword;
    }

    public void setCurrentPassword(String currentPassword) {
        this.currentPassword = currentPassword;
    }
}
