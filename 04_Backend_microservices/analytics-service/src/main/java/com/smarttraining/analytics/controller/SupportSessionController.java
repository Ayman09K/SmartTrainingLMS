package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.SupportSessionRequest;
import com.smarttraining.analytics.dto.SupportSessionResponse;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.service.SupportSessionService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/support-sessions")
public class SupportSessionController {

    private final SupportSessionService service;

    public SupportSessionController(SupportSessionService service) {
        this.service = service;
    }

    @PostMapping
    public SupportSessionResponse create(
            @Valid @RequestBody SupportSessionRequest request,
            JwtAuthenticationToken authentication
    ) {
        return service.create(request, AuthenticatedUser.from(authentication));
    }

    @PutMapping("/{sessionId}")
    public SupportSessionResponse update(
            @PathVariable Long sessionId,
            @Valid @RequestBody SupportSessionRequest request,
            JwtAuthenticationToken authentication
    ) {
        return service.update(
            sessionId,
            request,
            AuthenticatedUser.from(authentication)
        );
    }

    @PutMapping("/{sessionId}/complete")
    public SupportSessionResponse complete(
            @PathVariable Long sessionId,
            JwtAuthenticationToken authentication
    ) {
        return service.complete(
            sessionId,
            AuthenticatedUser.from(authentication)
        );
    }

    @PutMapping("/{sessionId}/cancel")
    public SupportSessionResponse cancel(
            @PathVariable Long sessionId,
            JwtAuthenticationToken authentication
    ) {
        return service.cancel(
            sessionId,
            AuthenticatedUser.from(authentication)
        );
    }

    @GetMapping("/me")
    public List<SupportSessionResponse> getMine(
            JwtAuthenticationToken authentication
    ) {
        return service.getMine(AuthenticatedUser.from(authentication));
    }

    @GetMapping("/trainer")
    public List<SupportSessionResponse> getForCurrentTrainer(
            JwtAuthenticationToken authentication
    ) {
        return service.getForCurrentTrainer(
            AuthenticatedUser.from(authentication)
        );
    }

    @GetMapping("/learner/{learnerId}")
    public List<SupportSessionResponse> getForLearner(
            @PathVariable Long learnerId,
            JwtAuthenticationToken authentication
    ) {
        return service.getForLearner(
            learnerId,
            AuthenticatedUser.from(authentication)
        );
    }

    @GetMapping("/{sessionId}")
    public SupportSessionResponse getById(
            @PathVariable Long sessionId,
            JwtAuthenticationToken authentication
    ) {
        return service.getById(
            sessionId,
            AuthenticatedUser.from(authentication)
        );
    }
}
