package com.smarttraining.auth.dto;

import com.smarttraining.auth.enums.AccentColor;
import com.smarttraining.auth.enums.UiTheme;
import jakarta.validation.constraints.NotNull;

public class UpdateUserPreferenceRequest {

    @NotNull(message = "Le thème est obligatoire")
    private UiTheme theme;

    @NotNull(message = "La couleur d'accentuation est obligatoire")
    private AccentColor accentColor;

    public UpdateUserPreferenceRequest() {
    }

    public UiTheme getTheme() {
        return theme;
    }

    public void setTheme(UiTheme theme) {
        this.theme = theme;
    }

    public AccentColor getAccentColor() {
        return accentColor;
    }

    public void setAccentColor(AccentColor accentColor) {
        this.accentColor = accentColor;
    }
}