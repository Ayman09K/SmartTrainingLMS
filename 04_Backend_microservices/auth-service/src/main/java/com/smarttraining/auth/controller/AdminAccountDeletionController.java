package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.AccountDeletionAdminResponse;
import com.smarttraining.auth.dto.AccountDeletionCompleteRequest;
import com.smarttraining.auth.dto.AccountDeletionRejectRequest;
import com.smarttraining.auth.enums.AccountDeletionRequestStatus;
import com.smarttraining.auth.service.AccountDeletionService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/admin/account-deletion-requests")
public class AdminAccountDeletionController {

    private final AccountDeletionService accountDeletionService;

    public AdminAccountDeletionController(
            AccountDeletionService accountDeletionService
    ) {
        this.accountDeletionService = accountDeletionService;
    }

    @GetMapping
    public List<AccountDeletionAdminResponse> list(
            @RequestParam(required = false) AccountDeletionRequestStatus status,
            Principal principal
    ) {
        return accountDeletionService.listForAdmin(
            requirePrincipal(principal),
            status
        );
    }

    @PutMapping("/{requestId}/start")
    public AccountDeletionAdminResponse start(
            @PathVariable Long requestId,
            Principal principal
    ) {
        return accountDeletionService.startProcessing(
            requirePrincipal(principal),
            requestId
        );
    }

    @PutMapping("/{requestId}/reject")
    public AccountDeletionAdminResponse reject(
            @PathVariable Long requestId,
            @Valid @RequestBody AccountDeletionRejectRequest request,
            Principal principal
    ) {
        return accountDeletionService.reject(
            requirePrincipal(principal),
            requestId,
            request.getAdminComment()
        );
    }

    @PutMapping("/{requestId}/complete")
    public AccountDeletionAdminResponse complete(
            @PathVariable Long requestId,
            @Valid @RequestBody AccountDeletionCompleteRequest request,
            Principal principal
    ) {
        return accountDeletionService.complete(
            requirePrincipal(principal),
            requestId,
            request.getAdminComment(),
            request.getProcessingConfirmed()
        );
    }

    private String requirePrincipal(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new IllegalArgumentException("Administrateur non authentifie");
        }
        return principal.getName();
    }
}
