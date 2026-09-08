package com.smarttraining.auth.entity;

import com.smarttraining.auth.enums.AccentColor;
import com.smarttraining.auth.enums.UiTheme;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_preferences")
public class UserPreference {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_user_preferences_user")
    )
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "ui_theme", nullable = false, length = 30)
    private UiTheme uiTheme = UiTheme.MODERN;

    @Enumerated(EnumType.STRING)
    @Column(name = "accent_color", nullable = false, length = 30)
    private AccentColor accentColor = AccentColor.BLUE;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public UserPreference() {
    }

    public UserPreference(User user) {
        this.user = user;
        this.uiTheme = UiTheme.MODERN;
        this.accentColor = AccentColor.BLUE;
    }

    @PrePersist
    public void prePersist() {
        if (uiTheme == null) {
            uiTheme = UiTheme.MODERN;
        }
        if (accentColor == null) {
            accentColor = AccentColor.BLUE;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getUserId() {
        return userId;
    }

    public User getUser() {
        return user;
    }

    public UiTheme getUiTheme() {
        return uiTheme;
    }

    public void setUiTheme(UiTheme uiTheme) {
        this.uiTheme = uiTheme == null ? UiTheme.MODERN : uiTheme;
    }

    public AccentColor getAccentColor() {
        return accentColor;
    }

    public void setAccentColor(AccentColor accentColor) {
        this.accentColor = accentColor == null ? AccentColor.BLUE : accentColor;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}