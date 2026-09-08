package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.AdminCreateUserRequest;
import com.smarttraining.auth.dto.AdminUpdateUserRoleRequest;
import com.smarttraining.auth.dto.AdminUpdateUserStatusRequest;
import com.smarttraining.auth.dto.UserResponse;
import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.enums.AccountStatus;
import com.smarttraining.auth.repository.UserRepository;
import com.smarttraining.auth.service.PasswordResetService;
import jakarta.validation.Valid;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetService passwordResetService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminUserController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            PasswordResetService passwordResetService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordResetService = passwordResetService;
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getUsers() {
        List<UserResponse> users = userRepository.findAll()
                .stream()
                .map(UserResponse::new)
                .toList();

        return ResponseEntity.ok(users);
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Un utilisateur existe déjà avec cet email");
        }

        String bootstrapPassword = generateBootstrapPassword();

        User user = new User(
                request.getFirstName().trim(),
                request.getLastName().trim(),
                email,
                passwordEncoder.encode(bootstrapPassword),
                request.getRole()
        );

        AccountStatus requestedStatus = request.getAccountStatus() == null
                ? AccountStatus.ACTIVE
                : request.getAccountStatus();

        user.setAccountStatus(requestedStatus);

        User savedUser = userRepository.save(user);

        /*
         * Le mot de passe bootstrap n'est jamais communique.
         * L'utilisateur definit son propre mot de passe via le flux
         * reset deja securise (token aleatoire, hashe, expirant, one-time).
         */
        passwordResetService.requestReset(savedUser.getEmail());

        return ResponseEntity.ok(new UserResponse(savedUser));
    }

    private String generateBootstrapPassword() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);
    }

    @PutMapping("/{userId}/role")
    public ResponseEntity<UserResponse> updateRole(
            @PathVariable Long userId,
            @Valid @RequestBody AdminUpdateUserRoleRequest request
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));

        user.setRole(request.getRole());

        return ResponseEntity.ok(new UserResponse(userRepository.save(user)));
    }

    @PutMapping("/{userId}/status")
    public ResponseEntity<UserResponse> updateStatus(
            @PathVariable Long userId,
            @Valid @RequestBody AdminUpdateUserStatusRequest request
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));

        user.setAccountStatus(request.getAccountStatus());

        return ResponseEntity.ok(new UserResponse(userRepository.save(user)));
    }
}
