package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.AccountDeletionRequestResponse;
import com.smarttraining.auth.service.AccountDeletionService;
import java.security.Principal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/me/account-deletion-request")
public class AccountDeletionController {

    private final AccountDeletionService accountDeletionService;

    public AccountDeletionController(AccountDeletionService accountDeletionService) {
        this.accountDeletionService = accountDeletionService;
    }

    @GetMapping
    public ResponseEntity<AccountDeletionRequestResponse> getMyRequest(Principal principal) {
        return accountDeletionService
                .getLatest(requirePrincipal(principal))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping
    public ResponseEntity<AccountDeletionRequestResponse> requestDeletion(Principal principal) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(accountDeletionService.requestDeletion(requirePrincipal(principal)));
    }

    @PutMapping("/cancel")
    public AccountDeletionRequestResponse cancelPending(Principal principal) {
        return accountDeletionService.cancelPending(requirePrincipal(principal));
    }

    private String requirePrincipal(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new IllegalArgumentException("Utilisateur non authentifie");
        }
        return principal.getName();
    }
}
