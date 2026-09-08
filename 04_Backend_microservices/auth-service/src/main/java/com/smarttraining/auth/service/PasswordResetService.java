package com.smarttraining.auth.service;

import com.smarttraining.auth.entity.PasswordResetToken;
import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.repository.UserRepository;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(PasswordResetService.class);

    public static final String NEUTRAL_FORGOT_MESSAGE =
            "Si un compte correspond a cette adresse e-mail, "
            + "un lien de reinitialisation a ete envoye.";

    public static final String RESET_SUCCESS_MESSAGE =
            "Le mot de passe a ete reinitialise.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetTokenService tokenService;
    private final PasswordResetMailService mailService;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            PasswordResetTokenService tokenService,
            PasswordResetMailService mailService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.mailService = mailService;
    }

    /**
     * La reponse publique ne depend jamais de l'existence du compte.
     * Les details techniques restent exclusivement dans les logs serveur.
     */
    @Transactional
    public String requestReset(String email) {
        String normalizedEmail = normalizeEmail(email);

        userRepository.findByEmail(normalizedEmail)
                .ifPresent(this::issueAndSend);

        return NEUTRAL_FORGOT_MESSAGE;
    }

    @Transactional
    public String resetPassword(
            String rawToken,
            String newPassword
    ) {
        PasswordResetToken resetToken =
                tokenService.requireUsableToken(rawToken);

        User user = userRepository.findById(
                resetToken.getUserId()
        ).orElseThrow(() -> new IllegalArgumentException(
                "PASSWORD_RESET_TOKEN_INVALID"
        ));

        if (
            passwordEncoder.matches(
                newPassword,
                user.getPassword()
            )
        ) {
            throw new IllegalArgumentException(
                    "Le nouveau mot de passe doit etre different de l'ancien"
            );
        }

        user.setPassword(
                passwordEncoder.encode(newPassword)
        );
        user.bumpAuthTokenVersion();

        userRepository.save(user);

        /*
         * Meme transaction : le nouveau mot de passe et la consommation
         * du token reussissent ou echouent ensemble.
         */
        tokenService.markUsed(resetToken);

        tokenService.invalidateOtherUnusedTokens(
                user.getId(),
                resetToken.getId()
        );

        return RESET_SUCCESS_MESSAGE;
    }

    private void issueAndSend(User user) {
        String rawToken = tokenService.issueToken(user.getId());

        try {
            mailService.sendPasswordReset(
                    user.getEmail(),
                    rawToken
            );
        } catch (IllegalStateException exception) {
            /*
             * Configuration mail absente/desactivee :
             * ne jamais exposer cette information au client.
             * Le token non livre est invalide immediatement.
             */
            tokenService.invalidateOtherUnusedTokens(
                    user.getId(),
                    null
            );

            LOGGER.warn(
                    "Password reset mail unavailable for userId={}: {}",
                    user.getId(),
                    exception.getMessage()
            );
        } catch (MailException exception) {
            /*
             * Un fournisseur SMTP peut avoir livre le message avant
             * de signaler une erreur. On conserve donc le token :
             * il expirera naturellement et reste utilisable si le mail
             * est effectivement arrive.
             */
            LOGGER.error(
                    "Password reset mail delivery failed for userId={}",
                    user.getId(),
                    exception
            );
        }
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return "";
        }

        return email
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}