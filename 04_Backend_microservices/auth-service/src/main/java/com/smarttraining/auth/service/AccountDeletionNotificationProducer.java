package com.smarttraining.auth.service;

import com.smarttraining.auth.client.AnalyticsNotificationInternalClient;
import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.enums.AccountDeletionRequestStatus;
import com.smarttraining.auth.enums.AccountStatus;
import com.smarttraining.auth.enums.UserRole;
import com.smarttraining.auth.event.AccountDeletionNotificationEvent;
import com.smarttraining.auth.repository.UserRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
public class AccountDeletionNotificationProducer {

    private static final Logger LOGGER =
        LoggerFactory.getLogger(AccountDeletionNotificationProducer.class);

    private final AnalyticsNotificationInternalClient client;
    private final UserRepository userRepository;

    public AccountDeletionNotificationProducer(
            AnalyticsNotificationInternalClient client,
            UserRepository userRepository
    ) {
        this.client = client;
        this.userRepository = userRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAccountDeletionEvent(AccountDeletionNotificationEvent event) {
        if (event == null || event.requestId() == null || event.userId() == null) {
            return;
        }

        if (event.notifyAdmins()) {
            notifyAdmins(event);
            return;
        }

        notifyRequester(event);
    }

    private void notifyAdmins(AccountDeletionNotificationEvent event) {
        List<User> admins = userRepository.findByRole(UserRole.ADMIN);

        for (User admin : admins) {
            if (
                admin == null
                || admin.getId() == null
                || !Boolean.TRUE.equals(admin.getEnabled())
                || admin.getAccountStatus() != AccountStatus.ACTIVE
            ) {
                continue;
            }

            boolean submitted =
                event.status() == AccountDeletionRequestStatus.PENDING;

            String title =
                submitted
                    ? "Nouvelle demande de suppression"
                    : "Demande de suppression mise a jour";

            String message =
                submitted
                    ? "Une nouvelle demande de suppression de compte attend un traitement administratif."
                    : "Une demande de suppression a ete annulee par son demandeur.";

            String type =
                submitted
                    ? "ACCOUNT_DELETION_REQUESTED"
                    : "ACCOUNT_DELETION_STATUS_UPDATED";

            deliver(
                admin.getId(),
                type,
                title,
                message,
                "/admin/account-deletion-requests",
                type
                    + ":"
                    + event.requestId()
                    + ":"
                    + event.status().name()
                    + ":ADMIN:"
                    + admin.getId()
            );
        }
    }

    private void notifyRequester(AccountDeletionNotificationEvent event) {
        String title;
        String message;

        switch (event.status()) {
            case IN_PROGRESS -> {
                title = "Suppression de compte en cours";
                message =
                    "Votre demande de suppression est maintenant prise en charge par un administrateur.";
            }
            case REJECTED -> {
                title = "Demande de suppression refusee";
                message =
                    "Votre demande de suppression a ete traitee. Consultez votre compte pour le commentaire administratif.";
            }
            case COMPLETED -> {
                title = "Traitement de suppression termine";
                message =
                    "Le traitement administratif de votre demande est termine. Consultez votre compte pour le detail.";
            }
            default -> {
                return;
            }
        }

        deliver(
            event.userId(),
            "ACCOUNT_DELETION_STATUS_UPDATED",
            title,
            message,
            accountUrl(event.roleSnapshot()),
            "ACCOUNT_DELETION_STATUS_UPDATED:"
                + event.requestId()
                + ":"
                + event.status().name()
                + ":USER:"
                + event.userId()
        );
    }

    private String accountUrl(String roleSnapshot) {
        if ("ADMIN".equals(roleSnapshot)) {
            return "/admin/account";
        }
        if ("FORMATEUR".equals(roleSnapshot)) {
            return "/trainer/account";
        }
        return "/learner/account";
    }

    private void deliver(
            Long userId,
            String notificationType,
            String title,
            String message,
            String actionUrl,
            String eventKey
    ) {
        try {
            client.create(
                userId,
                notificationType,
                title,
                message,
                actionUrl,
                eventKey
            );
        }
        catch (Exception exception) {
            LOGGER.warn(
                "Notification suppression non livree eventKey={}: {}",
                eventKey,
                exception.getMessage()
            );
        }
    }
}
