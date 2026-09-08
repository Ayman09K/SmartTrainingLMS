package com.smarttraining.training.controller;

import com.smarttraining.training.security.AuthenticatedUserService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/security")
public class SecurityIdentityController {

    private final AuthenticatedUserService authenticatedUserService;

    public SecurityIdentityController(
            AuthenticatedUserService authenticatedUserService
    ) {
        this.authenticatedUserService = authenticatedUserService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        Map<String, Object> identity = new LinkedHashMap<>();
        identity.put("userId", authenticatedUserService.getUserId());
        identity.put("role", authenticatedUserService.getRole());
        identity.put("subject", authenticatedUserService.getSubject());

        return ResponseEntity.ok(identity);
    }
}
