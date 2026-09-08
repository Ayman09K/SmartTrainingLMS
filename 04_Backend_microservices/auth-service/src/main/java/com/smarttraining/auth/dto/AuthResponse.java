package com.smarttraining.auth.dto;

import com.smarttraining.auth.enums.AccountStatus;
import com.smarttraining.auth.enums.Civilite;
import com.smarttraining.auth.enums.UserRole;

public class AuthResponse {

    private String token;
    private String tokenType = "Bearer";
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private Civilite civilite;
    private String avatarDataUrl;
    private UserRole role;
    private AccountStatus accountStatus;

    public AuthResponse() {
    }

    public AuthResponse(
            String token,
            Long userId,
            String firstName,
            String lastName,
            String email,
            Civilite civilite,
            String avatarDataUrl,
            UserRole role,
            AccountStatus accountStatus
    ) {
        this.token = token;
        this.userId = userId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.civilite = civilite;
        this.avatarDataUrl = avatarDataUrl;
        this.role = role;
        this.accountStatus = accountStatus;
    }

    public String getToken() {
        return token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getId() {
        return userId;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getFullName() {
        return firstName + " " + lastName;
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

    public AccountStatus getAccountStatus() {
        return accountStatus;
    }
}
