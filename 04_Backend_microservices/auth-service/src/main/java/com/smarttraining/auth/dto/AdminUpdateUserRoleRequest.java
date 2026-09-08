package com.smarttraining.auth.dto;

import com.smarttraining.auth.enums.UserRole;
import jakarta.validation.constraints.NotNull;

public class AdminUpdateUserRoleRequest {

    @NotNull(message = "Le rôle est obligatoire")
    private UserRole role;

    public AdminUpdateUserRoleRequest() {
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }
}
