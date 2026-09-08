package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.LearnerNotificationResponse;
import com.smarttraining.analytics.dto.UnreadNotificationCountResponse;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.service.LearnerNotificationService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/analytics/notifications")
public class LearnerNotificationController {

    private final LearnerNotificationService service;

    public LearnerNotificationController(
            LearnerNotificationService service
    ) {
        this.service = service;
    }

    @GetMapping("/me")
    public List<LearnerNotificationResponse> getMine(
            JwtAuthenticationToken authentication
    ) {
        return service.getMine(
            AuthenticatedUser.from(authentication)
        );
    }

    @GetMapping("/me/unread-count")
    public UnreadNotificationCountResponse getUnreadCount(
            JwtAuthenticationToken authentication
    ) {
        return new UnreadNotificationCountResponse(
            service.getUnreadCount(
                AuthenticatedUser.from(authentication)
            )
        );
    }

    // Canonical LP6 route.
    @PatchMapping("/me/{notificationId}/read")
    public LearnerNotificationResponse markReadCanonical(
            @PathVariable Long notificationId,
            JwtAuthenticationToken authentication
    ) {
        return service.markRead(
            notificationId,
            AuthenticatedUser.from(authentication)
        );
    }

    // Legacy compatibility route kept for existing Web clients.
    @PutMapping("/{notificationId}/read")
    public LearnerNotificationResponse markReadLegacy(
            @PathVariable Long notificationId,
            JwtAuthenticationToken authentication
    ) {
        return service.markRead(
            notificationId,
            AuthenticatedUser.from(authentication)
        );
    }

    // Canonical LP6 route.
    @PatchMapping("/me/read-all")
    public ResponseEntity<Void> markAllReadCanonical(
            JwtAuthenticationToken authentication
    ) {
        service.markAllRead(
            AuthenticatedUser.from(authentication)
        );

        return ResponseEntity.noContent().build();
    }

    // Legacy compatibility route kept for existing Web clients.
    @PutMapping("/me/read-all")
    public ResponseEntity<Void> markAllReadLegacy(
            JwtAuthenticationToken authentication
    ) {
        service.markAllRead(
            AuthenticatedUser.from(authentication)
        );

        return ResponseEntity.noContent().build();
    }
}