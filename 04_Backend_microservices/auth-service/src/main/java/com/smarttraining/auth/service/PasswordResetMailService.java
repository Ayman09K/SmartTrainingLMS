package com.smarttraining.auth.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetMailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final boolean mailEnabled;
    private final String mailFrom;
    private final String resetPublicUrl;

    public PasswordResetMailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${SMARTTRAINING_AUTH_MAIL_ENABLED:false}")
            boolean mailEnabled,
            @Value("${SMARTTRAINING_AUTH_MAIL_FROM:}")
            String mailFrom,
            @Value("${SMARTTRAINING_AUTH_PASSWORD_RESET_PUBLIC_URL:}")
            String resetPublicUrl
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.mailEnabled = mailEnabled;
        this.mailFrom = normalize(mailFrom);
        this.resetPublicUrl = normalize(resetPublicUrl);
    }

    public void sendPasswordReset(
            String recipientEmail,
            String rawToken
    ) {
        if (!mailEnabled) {
            throw new IllegalStateException(
                    "PASSWORD_RESET_MAIL_DISABLED"
            );
        }

        JavaMailSender mailSender =
                mailSenderProvider.getIfAvailable();

        if (mailSender == null) {
            throw new IllegalStateException(
                    "PASSWORD_RESET_MAIL_NOT_CONFIGURED"
            );
        }

        String recipient = normalize(recipientEmail);

        if (
            recipient.isBlank()
            || !recipient.contains("@")
        ) {
            throw new IllegalArgumentException(
                    "Adresse e-mail destinataire invalide"
            );
        }

        if (mailFrom.isBlank() || !mailFrom.contains("@")) {
            throw new IllegalStateException(
                    "PASSWORD_RESET_MAIL_FROM_NOT_CONFIGURED"
            );
        }

        if (
            resetPublicUrl.isBlank()
            || (
                !resetPublicUrl.startsWith("http://")
                && !resetPublicUrl.startsWith("https://")
            )
        ) {
            throw new IllegalStateException(
                    "PASSWORD_RESET_PUBLIC_URL_INVALID"
            );
        }

        String token = normalize(rawToken);

        if (token.length() < 32 || token.length() > 200) {
            throw new IllegalArgumentException(
                    "PASSWORD_RESET_TOKEN_INVALID"
            );
        }

        String separator =
                resetPublicUrl.contains("?") ? "&" : "?";

        String resetLink =
                resetPublicUrl
                + separator
                + "token="
                + URLEncoder.encode(
                    token,
                    StandardCharsets.UTF_8
                );

        SimpleMailMessage message =
                new SimpleMailMessage();

        message.setFrom(mailFrom);
        message.setTo(recipient);
        message.setSubject(
                "SmartTraining - Reinitialisation du mot de passe"
        );

        message.setText(
                "Bonjour,\n\n"
                + "Une demande de reinitialisation de votre mot de passe "
                + "SmartTraining a ete recue.\n\n"
                + "Utilisez ce lien :\n"
                + resetLink
                + "\n\n"
                + "Ce lien est temporaire et ne peut etre utilise qu'une seule fois.\n"
                + "Si vous n'etes pas a l'origine de cette demande, "
                + "ignorez simplement ce message.\n\n"
                + "SmartTraining"
        );

        mailSender.send(message);
    }

    boolean isMailEnabledForTest() {
        return mailEnabled;
    }

    String resetPublicUrlForTest() {
        return resetPublicUrl;
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.trim();
    }
}