package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.AuthResponse;
import com.smarttraining.auth.dto.ChangePasswordRequest;
import com.smarttraining.auth.dto.LoginRequest;
import com.smarttraining.auth.dto.ProfileUpdateRequest;
import com.smarttraining.auth.dto.RegisterRequest;
import com.smarttraining.auth.dto.UserResponse;
import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.repository.UserRepository;
import com.smarttraining.auth.service.AuthService;
import com.smarttraining.auth.exception.AuthRateLimitExceededException;
import com.smarttraining.auth.service.AuthEndpointRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Locale;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final AuthEndpointRateLimiter rateLimiter;

    public AuthController(
            AuthService authService,
            UserRepository userRepository,
            AuthEndpointRateLimiter rateLimiter
    ) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.rateLimiter = rateLimiter;
    }

    @GetMapping("/status")
    public ResponseEntity<String> status() {
        return ResponseEntity.ok("auth-service is running");
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest
    ) {
        if (!rateLimiter.tryAcquireRegister(clientKey(httpRequest))) {
            throw new AuthRateLimitExceededException(
                    "Trop de créations de compte. Réessayez plus tard."
            );
        }

        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        if (!rateLimiter.tryAcquireLogin(loginRateLimitKey(httpRequest, request.getEmail()))) {
            throw new AuthRateLimitExceededException(
                    "Trop de tentatives de connexion. Réessayez plus tard."
            );
        }

        return ResponseEntity.ok(authService.login(request));
    }

    @PutMapping("/me/profile")
    public ResponseEntity<AuthResponse> updateProfile(
            Principal principal,
            @Valid @RequestBody ProfileUpdateRequest request
    ) {
        if (principal == null) {
            throw new IllegalArgumentException(
                "Utilisateur non authentifié"
            );
        }

        return ResponseEntity.ok(
            authService.updateProfile(principal.getName(), request)
        );
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(
            Principal principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        if (principal == null) {
            throw new IllegalArgumentException(
                "Utilisateur non authentifié"
            );
        }

        authService.changePassword(principal.getName(), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Principal principal) {
        if (principal == null) {
            throw new IllegalArgumentException("Utilisateur non authentifié");
        }

        String email = principal.getName().trim().toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));

        return ResponseEntity.ok(new UserResponse(user));
    }

    private String loginRateLimitKey(HttpServletRequest request, String email) {
        String normalizedEmail =
                email == null || email.isBlank()
                        ? "unknown"
                        : email.trim().toLowerCase(Locale.ROOT);

        return clientKey(request) + "|account:" + normalizedEmail;
    }
    private String clientKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");

        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String firstHop = forwardedFor.split(",")[0].trim();

            if (!firstHop.isBlank()) {
                return firstHop;
            }
        }

        String realIp = request.getHeader("X-Real-IP");

        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        String remoteAddress = request.getRemoteAddr();

        return remoteAddress == null || remoteAddress.isBlank()
                ? "unknown"
                : remoteAddress.trim();
    }}
