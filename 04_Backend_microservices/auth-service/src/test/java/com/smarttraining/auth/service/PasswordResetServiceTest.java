package com.smarttraining.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.smarttraining.auth.entity.PasswordResetToken;
import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.enums.UserRole;
import com.smarttraining.auth.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class PasswordResetServiceTest {

    @Test
    void forgotReturnsSameNeutralMessageForUnknownEmail() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        PasswordResetTokenService tokens =
                mock(PasswordResetTokenService.class);
        PasswordResetMailService mails =
                mock(PasswordResetMailService.class);

        when(users.findByEmail("unknown@example.com"))
                .thenReturn(Optional.empty());

        PasswordResetService service =
                new PasswordResetService(
                        users,
                        encoder,
                        tokens,
                        mails
                );

        String result = service.requestReset(
                " Unknown@Example.com "
        );

        assertEquals(
                PasswordResetService.NEUTRAL_FORGOT_MESSAGE,
                result
        );

        verify(tokens, never()).issueToken(anyLong());
        verify(mails, never()).sendPasswordReset(
                anyString(),
                anyString()
        );
    }

    @Test
    void forgotExistingAccountIssuesAndSendsToken() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        PasswordResetTokenService tokens =
                mock(PasswordResetTokenService.class);
        PasswordResetMailService mails =
                mock(PasswordResetMailService.class);

        User user = new User(
                "Test",
                "Learner",
                "learner@example.com",
                "encoded",
                UserRole.APPRENANT
        );
        user.setId(12L);

        when(users.findByEmail("learner@example.com"))
                .thenReturn(Optional.of(user));

        when(tokens.issueToken(12L))
                .thenReturn("a".repeat(43));

        PasswordResetService service =
                new PasswordResetService(
                        users,
                        encoder,
                        tokens,
                        mails
                );

        String result = service.requestReset(
                "learner@example.com"
        );

        assertEquals(
                PasswordResetService.NEUTRAL_FORGOT_MESSAGE,
                result
        );

        verify(tokens).issueToken(12L);
        verify(mails).sendPasswordReset(
                "learner@example.com",
                "a".repeat(43)
        );
    }

    @Test
    void forgotMailDisabledStaysNeutralAndInvalidatesUndeliveredToken() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        PasswordResetTokenService tokens =
                mock(PasswordResetTokenService.class);
        PasswordResetMailService mails =
                mock(PasswordResetMailService.class);

        User user = new User(
                "Test",
                "Learner",
                "learner@example.com",
                "encoded",
                UserRole.APPRENANT
        );
        user.setId(13L);

        when(users.findByEmail("learner@example.com"))
                .thenReturn(Optional.of(user));

        when(tokens.issueToken(13L))
                .thenReturn("b".repeat(43));

        doThrow(
                new IllegalStateException(
                        "PASSWORD_RESET_MAIL_DISABLED"
                )
        ).when(mails).sendPasswordReset(
                "learner@example.com",
                "b".repeat(43)
        );

        PasswordResetService service =
                new PasswordResetService(
                        users,
                        encoder,
                        tokens,
                        mails
                );

        String result = service.requestReset(
                "learner@example.com"
        );

        assertEquals(
                PasswordResetService.NEUTRAL_FORGOT_MESSAGE,
                result
        );

        verify(tokens).invalidateOtherUnusedTokens(
                13L,
                null
        );
    }

    @Test
    void resetPasswordUpdatesHashAndConsumesToken() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        PasswordResetTokenService tokens =
                mock(PasswordResetTokenService.class);
        PasswordResetMailService mails =
                mock(PasswordResetMailService.class);

        String rawToken = "c".repeat(43);

        PasswordResetToken resetToken =
                spy(
                    new PasswordResetToken(
                            21L,
                            "d".repeat(64),
                            LocalDateTime.now().plusMinutes(20)
                    )
                );
        when(resetToken.getId()).thenReturn(99L);

        User user = new User(
                "Test",
                "Learner",
                "learner@example.com",
                "old-encoded",
                UserRole.APPRENANT
        );
        user.setId(21L);

        when(tokens.requireUsableToken(rawToken))
                .thenReturn(resetToken);

        when(users.findById(21L))
                .thenReturn(Optional.of(user));

        when(encoder.matches("NewPass123", "old-encoded"))
                .thenReturn(false);

        when(encoder.encode("NewPass123"))
                .thenReturn("new-encoded");

        PasswordResetService service =
                new PasswordResetService(
                        users,
                        encoder,
                        tokens,
                        mails
                );

        String result = service.resetPassword(
                rawToken,
                "NewPass123"
        );

        assertEquals(
                PasswordResetService.RESET_SUCCESS_MESSAGE,
                result
        );

        assertEquals(
                "new-encoded",
                user.getPassword()
        );

        verify(users).save(user);
        verify(tokens).markUsed(resetToken);
        verify(tokens).invalidateOtherUnusedTokens(
                21L,
                99L
        );
    }

    @Test
    void resetRejectsSamePasswordWithoutConsumingToken() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        PasswordResetTokenService tokens =
                mock(PasswordResetTokenService.class);
        PasswordResetMailService mails =
                mock(PasswordResetMailService.class);

        String rawToken = "e".repeat(43);

        PasswordResetToken resetToken =
                new PasswordResetToken(
                        22L,
                        "f".repeat(64),
                        LocalDateTime.now().plusMinutes(20)
                );

        User user = new User(
                "Test",
                "Learner",
                "learner@example.com",
                "same-encoded",
                UserRole.APPRENANT
        );
        user.setId(22L);

        when(tokens.requireUsableToken(rawToken))
                .thenReturn(resetToken);

        when(users.findById(22L))
                .thenReturn(Optional.of(user));

        when(encoder.matches("SamePass", "same-encoded"))
                .thenReturn(true);

        PasswordResetService service =
                new PasswordResetService(
                        users,
                        encoder,
                        tokens,
                        mails
                );

        IllegalArgumentException exception =
                assertThrows(
                        IllegalArgumentException.class,
                        () -> service.resetPassword(
                                rawToken,
                                "SamePass"
                        )
                );

        assertTrue(
                exception.getMessage().contains(
                        "different"
                )
        );

        verify(users, never()).save(any(User.class));
        verify(tokens, never()).markUsed(any());
    }
}