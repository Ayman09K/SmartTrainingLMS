package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.UpdateUserPreferenceRequest;
import com.smarttraining.auth.dto.UserPreferenceResponse;
import com.smarttraining.auth.service.UserPreferenceService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/me/preferences")
public class UserPreferenceController {

    private final UserPreferenceService preferenceService;

    public UserPreferenceController(
            UserPreferenceService preferenceService
    ) {
        this.preferenceService = preferenceService;
    }

    @GetMapping
    public ResponseEntity<UserPreferenceResponse> getPreferences(
            Principal principal
    ) {
        return ResponseEntity.ok(
            preferenceService.getPreferences(
                authenticatedEmail(principal)
            )
        );
    }

    @PutMapping
    public ResponseEntity<UserPreferenceResponse> updatePreferences(
            Principal principal,
            @Valid @RequestBody UpdateUserPreferenceRequest request
    ) {
        return ResponseEntity.ok(
            preferenceService.updatePreferences(
                authenticatedEmail(principal),
                request
            )
        );
    }

    private String authenticatedEmail(Principal principal) {
        if (principal == null) {
            throw new IllegalArgumentException(
                "Utilisateur non authentifié"
            );
        }

        return principal.getName();
    }
}