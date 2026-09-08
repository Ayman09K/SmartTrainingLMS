package com.smarttraining.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class PasswordResetMailServiceTest {

    @Test
    void disabledMailDoesNotRequireSmtpBean() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider =
                mock(ObjectProvider.class);

        PasswordResetMailService service =
                new PasswordResetMailService(
                        provider,
                        false,
                        "",
                        "http://localhost:5173/reset-password"
                );

        IllegalStateException exception =
                assertThrows(
                        IllegalStateException.class,
                        () -> service.sendPasswordReset(
                                "user@example.com",
                                "a".repeat(43)
                        )
                );

        assertEquals(
                "PASSWORD_RESET_MAIL_DISABLED",
                exception.getMessage()
        );

        verify(provider, never()).getIfAvailable();
    }

    @Test
    void enabledMailBuildsResetLinkAndSendsMessage() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider =
                mock(ObjectProvider.class);

        JavaMailSender sender = mock(JavaMailSender.class);

        when(provider.getIfAvailable())
                .thenReturn(sender);

        PasswordResetMailService service =
                new PasswordResetMailService(
                        provider,
                        true,
                        "smarttraining.sender@gmail.com",
                        "https://smarttraininglms.com/reset-password"
                );

        String rawToken = "A".repeat(43);

        service.sendPasswordReset(
                "learner@example.com",
                rawToken
        );

        ArgumentCaptor<SimpleMailMessage> captor =
                ArgumentCaptor.forClass(
                        SimpleMailMessage.class
                );

        verify(sender).send(captor.capture());

        SimpleMailMessage message = captor.getValue();

        assertArrayEquals(
                new String[] { "learner@example.com" },
                message.getTo()
        );

        assertEquals(
                "smarttraining.sender@gmail.com",
                message.getFrom()
        );

        assertNotNull(message.getSubject());
        assertTrue(
                message.getSubject().contains(
                        "Reinitialisation"
                )
        );

        assertNotNull(message.getText());
        assertTrue(
                message.getText().contains(
                        "https://smarttraininglms.com/reset-password?token="
                )
        );
        assertTrue(message.getText().contains(rawToken));
    }

    @Test
    void enabledMailRequiresConfiguredSenderBean() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider =
                mock(ObjectProvider.class);

        when(provider.getIfAvailable())
                .thenReturn(null);

        PasswordResetMailService service =
                new PasswordResetMailService(
                        provider,
                        true,
                        "sender@example.com",
                        "http://localhost:5173/reset-password"
                );

        IllegalStateException exception =
                assertThrows(
                        IllegalStateException.class,
                        () -> service.sendPasswordReset(
                                "learner@example.com",
                                "b".repeat(43)
                        )
                );

        assertEquals(
                "PASSWORD_RESET_MAIL_NOT_CONFIGURED",
                exception.getMessage()
        );
    }

    @Test
    void publicResetUrlMustBeHttpOrHttps() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider =
                mock(ObjectProvider.class);

        JavaMailSender sender = mock(JavaMailSender.class);

        when(provider.getIfAvailable())
                .thenReturn(sender);

        PasswordResetMailService service =
                new PasswordResetMailService(
                        provider,
                        true,
                        "sender@example.com",
                        "javascript:alert(1)"
                );

        IllegalStateException exception =
                assertThrows(
                        IllegalStateException.class,
                        () -> service.sendPasswordReset(
                                "learner@example.com",
                                "c".repeat(43)
                        )
                );

        assertEquals(
                "PASSWORD_RESET_PUBLIC_URL_INVALID",
                exception.getMessage()
        );

        verify(sender, never())
                .send(any(SimpleMailMessage.class));
    }
}