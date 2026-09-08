package com.smarttraining.auth.service;

import com.smarttraining.auth.dto.AuthResponse;
import com.smarttraining.auth.dto.ChangePasswordRequest;
import com.smarttraining.auth.dto.LoginRequest;
import com.smarttraining.auth.dto.ProfileUpdateRequest;
import com.smarttraining.auth.dto.RegisterRequest;
import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.enums.UserRole;
import com.smarttraining.auth.repository.UserRepository;
import com.smarttraining.auth.security.JwtService;
import java.util.Locale;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Un utilisateur existe déjà avec cet email");
        }

        /*
         * Sécurité : l'inscription publique ne prend jamais le rôle envoyé
         * par le client. Le compte créé est toujours APPRENANT.
         */
        User user = new User(
                request.getFirstName().trim(),
                request.getLastName().trim(),
                email,
                passwordEncoder.encode(request.getPassword()),
                UserRole.APPRENANT
        );

        User savedUser = userRepository.save(user);
        String token = jwtService.generateToken(savedUser);

        return toAuthResponse(savedUser, token);
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));

        if (!user.isActiveAccount()) {
            throw new DisabledException("Compte désactivé ou suspendu");
        }

        String token = jwtService.generateToken(user);

        return toAuthResponse(user, token);
    }

    @Transactional
    public AuthResponse updateProfile(
            String authenticatedEmail,
            ProfileUpdateRequest request
    ) {
        User user = findByAuthenticatedEmail(authenticatedEmail);

        String newEmail = normalizeEmail(request.getEmail());
        String currentEmail = normalizeEmail(user.getEmail());
        boolean emailChanged = !newEmail.equals(currentEmail);

        if (emailChanged) {
            if (
                request.getCurrentPassword() == null
                || request.getCurrentPassword().isBlank()
                || !passwordEncoder.matches(
                    request.getCurrentPassword(),
                    user.getPassword()
                )
            ) {
                throw new IllegalArgumentException(
                    "Le mot de passe actuel est obligatoire pour modifier l'adresse e-mail"
                );
            }

            userRepository.findByEmail(newEmail).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    throw new IllegalArgumentException(
                        "Un utilisateur existe déjà avec cet email"
                    );
                }
            });
        }

        /*
         * Les anciens comptes peuvent contenir une casse ou des espaces
         * historiques. Une différence de représentation n'est pas un
         * changement d'adresse e-mail et ne doit pas demander le mot de passe.
         * On profite de l'enregistrement pour normaliser la valeur persistée.
         */
        user.setEmail(newEmail);

        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setCivilite(request.getCivilite());

        if (request.getAvatarDataUrl() != null) {
            user.setAvatarDataUrl(normalizeAvatar(request.getAvatarDataUrl()));
        }

        User saved = userRepository.save(user);
        String refreshedToken = jwtService.generateToken(saved);

        return toAuthResponse(saved, refreshedToken);
    }

    @Transactional
    public void changePassword(
            String authenticatedEmail,
            ChangePasswordRequest request
    ) {
        User user = findByAuthenticatedEmail(authenticatedEmail);

        if (!passwordEncoder.matches(
                request.getCurrentPassword(),
                user.getPassword()
        )) {
            throw new IllegalArgumentException(
                "Le mot de passe actuel est incorrect"
            );
        }

        if (passwordEncoder.matches(
                request.getNewPassword(),
                user.getPassword()
        )) {
            throw new IllegalArgumentException(
                "Le nouveau mot de passe doit être différent de l'ancien"
            );
        }

        user.setPassword(
            passwordEncoder.encode(request.getNewPassword())
        );
        userRepository.save(user);
    }

    private User findByAuthenticatedEmail(String authenticatedEmail) {
        if (authenticatedEmail == null || authenticatedEmail.isBlank()) {
            throw new IllegalArgumentException(
                "Utilisateur non authentifié"
            );
        }

        return userRepository.findByEmail(
                normalizeEmail(authenticatedEmail)
            )
            .orElseThrow(() -> new IllegalArgumentException(
                "Utilisateur introuvable"
            ));
    }

    private String normalizeAvatar(String avatarDataUrl) {
        String value = avatarDataUrl == null
                ? null
                : avatarDataUrl.trim();

        if (value == null || value.isBlank()) {
            return null;
        }

        if (value.length() > 1_500_000) {
            throw new IllegalArgumentException(
                "La photo de profil est trop volumineuse"
            );
        }

        if (
            !value.startsWith("data:image/png;base64,")
            && !value.startsWith("data:image/jpeg;base64,")
            && !value.startsWith("data:image/webp;base64,")
        ) {
            throw new IllegalArgumentException(
                "La photo doit être au format PNG, JPEG ou WebP"
            );
        }

        return value;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private AuthResponse toAuthResponse(User user, String token) {
        return new AuthResponse(
                token,
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getCivilite(),
                user.getAvatarDataUrl(),
                user.getRole(),
                user.getAccountStatus()
        );
    }
}
