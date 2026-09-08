package com.smarttraining.auth.service;

import com.smarttraining.auth.entity.PasswordResetToken;
import com.smarttraining.auth.repository.PasswordResetTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetTokenService {

    private static final int RAW_TOKEN_BYTES = 32;

    private final PasswordResetTokenRepository tokenRepository;
    private final SecureRandom secureRandom;
    private final long ttlMinutes;

    public PasswordResetTokenService(
            PasswordResetTokenRepository tokenRepository,
            @Value("${SMARTTRAINING_AUTH_PASSWORD_RESET_TTL_MINUTES:30}")
            long ttlMinutes
    ) {
        if (ttlMinutes <= 0 || ttlMinutes > 1440) {
            throw new IllegalArgumentException(
                "SMARTTRAINING_AUTH_PASSWORD_RESET_TTL_MINUTES doit etre compris entre 1 et 1440"
            );
        }

        this.tokenRepository = tokenRepository;
        this.secureRandom = new SecureRandom();
        this.ttlMinutes = ttlMinutes;
    }

    /**
     * Genere un token brut destine uniquement au canal de livraison
     * (e-mail a l'etape suivante). Seul son SHA-256 est persiste.
     */
    @Transactional
    public String issueToken(Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("Utilisateur invalide");
        }

        LocalDateTime now = LocalDateTime.now();
        invalidateUnusedTokens(userId, now);

        byte[] randomBytes = new byte[RAW_TOKEN_BYTES];
        secureRandom.nextBytes(randomBytes);

        String rawToken = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);

        String tokenHash = hash(rawToken);

        PasswordResetToken token = new PasswordResetToken(
                userId,
                tokenHash,
                now.plusMinutes(ttlMinutes)
        );

        tokenRepository.save(token);

        return rawToken;
    }

    /**
     * Recherche un token utilisable sans le consommer.
     * La consommation doit rester dans la transaction atomique
     * qui remplacera le mot de passe.
     */
    @Transactional
    public PasswordResetToken requireUsableToken(String rawToken) {
        String tokenHash = hash(requireRawToken(rawToken));

        PasswordResetToken token = tokenRepository
                .findFirstByTokenHashAndUsedAtIsNull(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException(
                        "PASSWORD_RESET_TOKEN_INVALID"
                ));

        if (token.isExpired(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "PASSWORD_RESET_TOKEN_EXPIRED"
            );
        }

        return token;
    }

    @Transactional
    public void markUsed(PasswordResetToken token) {
        if (token == null || token.getId() == null) {
            throw new IllegalArgumentException(
                    "PASSWORD_RESET_TOKEN_INVALID"
            );
        }

        if (token.isUsed()) {
            throw new IllegalArgumentException(
                    "PASSWORD_RESET_TOKEN_INVALID"
            );
        }

        token.markUsed(LocalDateTime.now());
        tokenRepository.save(token);
    }

    @Transactional
    public void invalidateOtherUnusedTokens(
            Long userId,
            Long tokenIdToKeep
    ) {
        if (userId == null || userId <= 0) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        tokenRepository.findAllByUserIdAndUsedAtIsNull(userId)
                .stream()
                .filter(token ->
                        tokenIdToKeep == null
                        || !tokenIdToKeep.equals(token.getId())
                )
                .forEach(token -> token.markUsed(now));
    }

    long getTtlMinutes() {
        return ttlMinutes;
    }

    String hashForTest(String rawToken) {
        return hash(requireRawToken(rawToken));
    }

    private void invalidateUnusedTokens(
            Long userId,
            LocalDateTime now
    ) {
        List<PasswordResetToken> existing =
                tokenRepository.findAllByUserIdAndUsedAtIsNull(userId);

        if (existing.isEmpty()) {
            return;
        }

        existing.forEach(token -> token.markUsed(now));
        tokenRepository.saveAll(existing);
    }

    private String requireRawToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException(
                    "PASSWORD_RESET_TOKEN_INVALID"
            );
        }

        String normalized = rawToken.trim();

        if (normalized.length() < 32 || normalized.length() > 200) {
            throw new IllegalArgumentException(
                    "PASSWORD_RESET_TOKEN_INVALID"
            );
        }

        return normalized;
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hashed = digest.digest(
                    rawToken.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "SHA-256 indisponible",
                    exception
            );
        }
    }
}