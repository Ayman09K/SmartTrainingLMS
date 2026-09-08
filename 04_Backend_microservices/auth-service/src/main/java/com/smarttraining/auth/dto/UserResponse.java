package com.smarttraining.auth.dto;

import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.enums.AccountStatus;
import com.smarttraining.auth.enums.Civilite;
import com.smarttraining.auth.enums.UserRole;
import java.time.LocalDateTime;

public class UserResponse {

    private Long id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private Civilite civilite;
    private String avatarDataUrl;
    private UserRole role;
    private Boolean enabled;
    private AccountStatus accountStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public UserResponse() {
    }

    public UserResponse(User user) {
        this.id = user.getId();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.fullName = user.getFullName();
        this.email = user.getEmail();
        this.civilite = user.getCivilite();
        this.avatarDataUrl = user.getAvatarDataUrl();
        this.role = user.getRole();
        this.enabled = user.getEnabled();
        this.accountStatus = user.getAccountStatus();
        this.createdAt = user.getCreatedAt();
        this.updatedAt = user.getUpdatedAt();
    }

    public Long getId() {
        return id;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public Civilite getCivilite() {
        return civilite;
    }

    public String getAvatarDataUrl() {
        return avatarDataUrl;
    }

    public UserRole getRole() {
        return role;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public AccountStatus getAccountStatus() {
        return accountStatus;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
