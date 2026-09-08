package com.smarttraining.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.smarttraining.auth.entity.PasswordResetToken;
import com.smarttraining.auth.repository.PasswordResetTokenRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class PasswordResetTokenServiceTest {

    @Test
    void issueTokenStoresOnlySha256AndInvalidatesPreviousToken() {
        PasswordResetTokenRepository repository =
                mock(PasswordResetTokenRepository.class);

        PasswordResetToken previous = new PasswordResetToken(
                42L,
                "a".repeat(64),
                LocalDateTime.now().plusMinutes(10)
        );

        when(repository.findAllByUserIdAndUsedAtIsNull(42L))
                .thenReturn(List.of(previous));

        PasswordResetTokenService service =
                new PasswordResetTokenService(repository, 30);

        String rawToken = service.issueToken(42L);

        assertNotNull(rawToken);
        assertTrue(rawToken.length() >= 40);
        assertFalse(previous.getUsedAt() == null);

        ArgumentCaptor<PasswordResetToken> captor =
                ArgumentCaptor.forClass(PasswordResetToken.class);

        verify(repository).save(captor.capture());

        PasswordResetToken persisted = captor.getValue();

        assertNotEquals(rawToken, persisted.getTokenHash());
        assertEquals(64, persisted.getTokenHash().length());
        assertTrue(
                persisted.getTokenHash().matches("[0-9a-f]{64}")
        );
        assertEquals(
                service.hashForTest(rawToken),
                persisted.getTokenHash()
        );
        assertTrue(
                persisted.getExpiresAt().isAfter(
                        LocalDateTime.now().plusMinutes(25)
                )
        );
    }

    @Test
    void requireUsableTokenRejectsExpiredToken() {
        PasswordResetTokenRepository repository =
                mock(PasswordResetTokenRepository.class);

        PasswordResetTokenService service =
                new PasswordResetTokenService(repository, 30);

        String raw = "x".repeat(43);
        String hash = service.hashForTest(raw);

        PasswordResetToken expired = new PasswordResetToken(
                7L,
                hash,
                LocalDateTime.now().minusMinutes(1)
        );

        when(repository.findFirstByTokenHashAndUsedAtIsNull(hash))
                .thenReturn(Optional.of(expired));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.requireUsableToken(raw)
        );

        assertEquals(
                "PASSWORD_RESET_TOKEN_EXPIRED",
                exception.getMessage()
        );
    }

    @Test
    void requireUsableTokenRejectsUnknownOrUsedToken() {
        PasswordResetTokenRepository repository =
                mock(PasswordResetTokenRepository.class);

        PasswordResetTokenService service =
                new PasswordResetTokenService(repository, 30);

        String raw = "y".repeat(43);
        String hash = service.hashForTest(raw);

        when(repository.findFirstByTokenHashAndUsedAtIsNull(hash))
                .thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.requireUsableToken(raw)
        );

        assertEquals(
                "PASSWORD_RESET_TOKEN_INVALID",
                exception.getMessage()
        );
    }

    @Test
    void ttlMustStayInsideSafeBounds() {
        PasswordResetTokenRepository repository =
                mock(PasswordResetTokenRepository.class);

        assertThrows(
                IllegalArgumentException.class,
                () -> new PasswordResetTokenService(repository, 0)
        );

        assertThrows(
                IllegalArgumentException.class,
                () -> new PasswordResetTokenService(repository, 1441)
        );
    }
}