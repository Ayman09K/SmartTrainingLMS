package com.smarttraining.training.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class AuthenticatedUserService {

    public Long getUserId() {
        Object rawUserId = currentJwt().getToken().getClaim("userId");

        if (rawUserId == null) {
            throw new AccessDeniedException("Le JWT ne contient pas le claim userId");
        }

        if (rawUserId instanceof Number number) {
            return number.longValue();
        }

        try {
            return Long.valueOf(rawUserId.toString());
        } catch (NumberFormatException exception) {
            throw new AccessDeniedException("Le claim userId du JWT est invalide");
        }
    }

    public String getRole() {
        Object rawRole = currentJwt().getToken().getClaim("role");

        if (rawRole == null || rawRole.toString().isBlank()) {
            throw new AccessDeniedException("Le JWT ne contient pas le claim role");
        }

        return rawRole.toString();
    }

    public String getSubject() {
        String subject = currentJwt().getToken().getSubject();

        if (subject == null || subject.isBlank()) {
            throw new AccessDeniedException("Le JWT ne contient pas de sujet");
        }

        return subject;
    }

    private JwtAuthenticationToken currentJwt() {
        Authentication authentication = SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)
                || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Utilisateur JWT non authentifié");
        }

        return jwtAuthentication;
    }
}
