package com.smarttraining.analytics.security;

import java.util.Locale;
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
            throw new IllegalArgumentException("Authentification JWT absente.");
        }

        Object claim = authentication.getToken().getClaims().get("userId");
        Long userId = null;

        if (claim instanceof Number number) {
            userId = number.longValue();
        } else if (claim instanceof String text && !text.isBlank()) {
            try {
                userId = Long.valueOf(text);
            } catch (NumberFormatException ignored) {
                userId = null;
            }
        }

        String subject = authentication.getToken().getSubject();
        String role = authentication.getToken().getClaimAsString("role");

        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId JWT invalide.");
        }
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("sub JWT invalide.");
        }
        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException("role JWT invalide.");
        }

        return new AuthenticatedUser(
            userId,
            subject.trim().toLowerCase(Locale.ROOT),
            role.trim().toUpperCase(Locale.ROOT)
        );
    }

    public Long getUserId() { return userId; }
    public String getSubject() { return subject; }
    public String getRole() { return role; }

    public boolean isEducator() {
        return "ADMIN".equals(role) || "FORMATEUR".equals(role);
    }
}