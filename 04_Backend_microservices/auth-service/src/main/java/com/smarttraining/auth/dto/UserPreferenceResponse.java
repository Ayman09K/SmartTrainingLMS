package com.smarttraining.auth.dto;

import com.smarttraining.auth.entity.UserPreference;
import com.smarttraining.auth.enums.AccentColor;
import com.smarttraining.auth.enums.UiTheme;

public class UserPreferenceResponse {

    private UiTheme theme;
    private AccentColor accentColor;

    public UserPreferenceResponse() {
    }

    public UserPreferenceResponse(
            UiTheme theme,
            AccentColor accentColor
    ) {
        this.theme = theme;
        this.accentColor = accentColor;
    }

    public UserPreferenceResponse(UserPreference preference) {
        this(
            preference.getUiTheme(),
            preference.getAccentColor()
        );
    }

    public static UserPreferenceResponse defaults() {
        return new UserPreferenceResponse(
            UiTheme.MODERN,
            AccentColor.BLUE
        );
    }

    public UiTheme getTheme() {
        return theme;
    }

    public AccentColor getAccentColor() {
        return accentColor;
    }
}