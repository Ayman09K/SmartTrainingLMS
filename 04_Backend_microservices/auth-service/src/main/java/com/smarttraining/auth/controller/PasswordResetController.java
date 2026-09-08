package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.ForgotPasswordRequest;
import com.smarttraining.auth.dto.PasswordResetMessageResponse;
import com.smarttraining.auth.dto.ResetPasswordRequest;
import com.smarttraining.auth.service.PasswordResetService;
import com.smarttraining.auth.service.PasswordResetRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/password")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;
    private final PasswordResetRateLimiter rateLimiter;

    public PasswordResetController(
            PasswordResetService passwordResetService,
            PasswordResetRateLimiter rateLimiter
    ) {
        this.passwordResetService = passwordResetService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/forgot")
    public ResponseEntity<PasswordResetMessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        if (!rateLimiter.tryAcquire(clientKey(httpRequest))) {
            return ResponseEntity
                    .status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new PasswordResetMessageResponse(
                            "Trop de demandes. Reessayez plus tard."
                    ));
        }

        return ResponseEntity.ok(
                new PasswordResetMessageResponse(
                        passwordResetService.requestReset(
                                request.getEmail()
                        )
                )
        );
    }

    @PostMapping("/reset")
    public ResponseEntity<PasswordResetMessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        return ResponseEntity.ok(
                new PasswordResetMessageResponse(
                        passwordResetService.resetPassword(
                                request.getToken(),
                                request.getNewPassword()
                        )
                )
        );
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