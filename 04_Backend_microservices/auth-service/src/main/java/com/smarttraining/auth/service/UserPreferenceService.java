package com.smarttraining.auth.service;

import com.smarttraining.auth.dto.UpdateUserPreferenceRequest;
import com.smarttraining.auth.dto.UserPreferenceResponse;
import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.entity.UserPreference;
import com.smarttraining.auth.repository.UserPreferenceRepository;
import com.smarttraining.auth.repository.UserRepository;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserPreferenceService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository preferenceRepository;

    public UserPreferenceService(
            UserRepository userRepository,
            UserPreferenceRepository preferenceRepository
    ) {
        this.userRepository = userRepository;
        this.preferenceRepository = preferenceRepository;
    }

    @Transactional(readOnly = true)
    public UserPreferenceResponse getPreferences(
            String authenticatedEmail
    ) {
        User user = findAuthenticatedUser(authenticatedEmail);

        return preferenceRepository.findById(user.getId())
                .map(UserPreferenceResponse::new)
                .orElseGet(UserPreferenceResponse::defaults);
    }

    @Transactional
    public UserPreferenceResponse updatePreferences(
            String authenticatedEmail,
            UpdateUserPreferenceRequest request
    ) {
        User user = findAuthenticatedUser(authenticatedEmail);

        UserPreference preference = preferenceRepository
                .findById(user.getId())
                .orElseGet(() -> new UserPreference(user));

        preference.setUiTheme(request.getTheme());
        preference.setAccentColor(request.getAccentColor());

        UserPreference saved = preferenceRepository.save(preference);

        return new UserPreferenceResponse(saved);
    }

    private User findAuthenticatedUser(String authenticatedEmail) {
        if (
            authenticatedEmail == null
            || authenticatedEmail.isBlank()
        ) {
            throw new IllegalArgumentException(
                "Utilisateur non authentifié"
            );
        }

        String normalizedEmail = authenticatedEmail
                .trim()
                .toLowerCase(Locale.ROOT);

        return userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException(
                    "Utilisateur introuvable"
                ));
    }
}