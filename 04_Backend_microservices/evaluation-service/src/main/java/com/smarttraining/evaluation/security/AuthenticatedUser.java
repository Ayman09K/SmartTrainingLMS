package com.smarttraining.evaluation.security;

import java.util.Locale;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public final class AuthenticatedUser {

    private final Long userId;
    private final String subject;
    private final String role;

    private AuthenticatedUser(Long userId, String subject, String role) {
        this.userId = userId;
        this.subject = subject;
        this.role = role;
    }

    public static AuthenticatedUser from(JwtAuthenticationToken authentication) {
        if (authentication == null) {
            throw new AccessDeniedException("Authentification JWT absente.");
        }

        Object rawUserId = authentication.getToken().getClaim("userId");
        Long userId = null;

        if (rawUserId instanceof Number number) {
            userId = number.longValue();
        } else if (rawUserId != null) {
            try {
                userId = Long.valueOf(rawUserId.toString());
            } catch (NumberFormatException ignored) {
                userId = null;
            }
        }

        String subject = authentication.getToken().getSubject();
        String role = authentication.getToken().getClaimAsString("role");

        if (userId == null || userId <= 0) {
            throw new AccessDeniedException("userId JWT invalide.");
        }
        if (subject == null || subject.isBlank()) {
            throw new AccessDeniedException("sub JWT invalide.");
        }
        if (role == null || role.isBlank()) {
            throw new AccessDeniedException("role JWT invalide.");
        }

        return new AuthenticatedUser(
                userId,
                subject.trim().toLowerCase(Locale.ROOT),
                role.trim().toUpperCase(Locale.ROOT)
        );
    }

    public void requireLearner() {
        if (!"APPRENANT".equals(role)
                && !"FORMATEUR".equals(role)
                && !"ADMIN".equals(role)) {
            throw new AccessDeniedException(
                    "Cette route necessite une identite utilisateur pouvant suivre une formation."
            );
        }
    }

    public Long getUserId() {
        return userId;
    }

    public String getSubject() {
        return subject;
    }

    public String getRole() {
        return role;
    }
}
