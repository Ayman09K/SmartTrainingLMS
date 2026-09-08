package com.smarttraining.auth.dto;

import com.smarttraining.auth.enums.AccountStatus;
import jakarta.validation.constraints.NotNull;

public class AdminUpdateUserStatusRequest {

    @NotNull(message = "Le statut est obligatoire")
    private AccountStatus accountStatus;

    public AdminUpdateUserStatusRequest() {
    }

    public AccountStatus getAccountStatus() {
        return accountStatus;
    }

    public void setAccountStatus(AccountStatus accountStatus) {
        this.accountStatus = accountStatus;
    }
}
