package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.InternalNotificationCreateRequest;
import com.smarttraining.analytics.dto.LearnerNotificationResponse;
import com.smarttraining.analytics.entity.Feedback;
import com.smarttraining.analytics.entity.LearnerNotification;
import com.smarttraining.analytics.entity.SupportSession;
import com.smarttraining.analytics.enums.LearnerNotificationType;
import com.smarttraining.analytics.repository.LearnerNotificationRepository;
import com.smarttraining.analytics.security.AuthenticatedUser;
import java.util.List;
import java.util.Objects;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class LearnerNotificationService {

    private static final String SUPPORT_SESSIONS_URL =
        "/learner/support-sessions";

    private static final String FEEDBACK_URL =
        "/learner/feedbacks";

    private final LearnerNotificationRepository repository;

    public LearnerNotificationService(
            LearnerNotificationRepository repository
    ) {
        this.repository = repository;
    }

    public LearnerNotificationResponse createInternal(
            InternalNotificationCreateRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException(
                "Notification interne obligatoire."
            );
        }

        return createOrGet(
            request.getUserId(),
            request.getSupportSessionId(),
            request.getTrainingId(),
            request.getNotificationType(),
            request.getTitle(),
            request.getMessage(),
            request.getActionUrl(),
            request.getEventKey()
        );
    }

    public void notifySupportSession(
            SupportSession session,
            LearnerNotificationType notificationType
    ) {
        if (session == null || session.getId() == null) {
            throw new IllegalArgumentException(
                "Une seance persistante est obligatoire pour notifier l'utilisateur."
            );
        }

        String eventKey = supportEventKey(
            session,
            notificationType
        );

        createOrGet(
            session.getLearnerId(),
            session.getId(),
            session.getTrainingId(),
            notificationType,
            notificationTitle(notificationType),
            notificationMessage(
                notificationType,
                session.getTitle()
            ),
            SUPPORT_SESSIONS_URL,
            eventKey
        );
    }

    public void notifyFeedbackResponse(Feedback feedback) {
        if (
            feedback == null
            || feedback.getId() == null
            || feedback.getLearnerId() == null
            || feedback.getTrainingId() == null
        ) {
            throw new IllegalArgumentException(
                "Feedback persistant incomplet pour notification."
            );
        }

        String response = cleanNullable(
            feedback.getTrainerResponse()
        );

        String message =
            response == null
                ? "Votre feedback a ete traite par votre formateur."
                : "Votre formateur a repondu a votre feedback : " + response;

        createOrGet(
            feedback.getLearnerId(),
            null,
            feedback.getTrainingId(),
            LearnerNotificationType.FEEDBACK_RESPONSE,
            "Reponse a votre feedback",
            message,
            FEEDBACK_URL,
            "FEEDBACK_RESPONSE:" + feedback.getId()
        );
    }

    @Transactional(readOnly = true)
    public List<LearnerNotificationResponse> getMine(
            AuthenticatedUser actor
    ) {
        requireAuthenticated(actor);

        return repository
            .findByUserIdOrderByCreatedAtDesc(actor.getUserId())
            .stream()
            .map(LearnerNotificationResponse::new)
            .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(AuthenticatedUser actor) {
        requireAuthenticated(actor);

        return repository.countByUserIdAndReadAtIsNull(
            actor.getUserId()
        );
    }

    public LearnerNotificationResponse markRead(
            Long notificationId,
            AuthenticatedUser actor
    ) {
        requireAuthenticated(actor);

        LearnerNotification notification =
            getOwned(notificationId, actor);

        notification.markRead();

        return new LearnerNotificationResponse(
            repository.save(notification)
        );
    }

    public void markAllRead(AuthenticatedUser actor) {
        requireAuthenticated(actor);

        List<LearnerNotification> notifications =
            repository.findByUserIdOrderByCreatedAtDesc(
                actor.getUserId()
            );

        notifications.stream()
            .filter(notification -> !notification.isRead())
            .forEach(LearnerNotification::markRead);

        repository.saveAll(notifications);
    }

    private LearnerNotificationResponse createOrGet(
            Long userId,
            Long supportSessionId,
            Long trainingId,
            LearnerNotificationType notificationType,
            String title,
            String message,
            String actionUrl,
            String eventKey
    ) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException(
                "Destinataire notification invalide."
            );
        }

        if (trainingId != null && trainingId <= 0) {
            throw new IllegalArgumentException(
                "Formation notification invalide."
            );
        }

        if (notificationType == null) {
            throw new IllegalArgumentException(
                "Type notification obligatoire."
            );
        }

        String normalizedEventKey = cleanRequired(
            eventKey,
            "eventKey"
        );

        return repository
            .findByEventKey(normalizedEventKey)
            .map(LearnerNotificationResponse::new)
            .orElseGet(() -> {
                LearnerNotification notification =
                    new LearnerNotification(
                        userId,
                        supportSessionId,
                        trainingId,
                        notificationType,
                        cleanRequired(title,"title"),
                        cleanRequired(message,"message"),
                        cleanRequired(actionUrl,"actionUrl"),
                        normalizedEventKey
                    );

                return new LearnerNotificationResponse(
                    repository.save(notification)
                );
            });
    }

    private LearnerNotification getOwned(
            Long notificationId,
            AuthenticatedUser actor
    ) {
        LearnerNotification notification = repository
            .findById(notificationId)
            .orElseThrow(() -> new IllegalArgumentException(
                "Notification introuvable avec id=" + notificationId
            ));

        if (!actor.getUserId().equals(notification.getUserId())) {
            throw new AccessDeniedException(
                "Un utilisateur ne peut modifier que ses propres notifications."
            );
        }

        return notification;
    }

    private void requireAuthenticated(AuthenticatedUser actor) {
        if (
            actor == null
            || actor.getUserId() == null
            || actor.getUserId() <= 0
        ) {
            throw new AccessDeniedException(
                "Utilisateur authentifie obligatoire."
            );
        }
    }

    private String supportEventKey(
            SupportSession session,
            LearnerNotificationType type
    ) {
        if (type == LearnerNotificationType.SUPPORT_SESSION_UPDATED) {
            int fingerprint = Objects.hash(
                session.getScheduledAt(),
                session.getTitle(),
                session.getMeetingLink(),
                session.getNote()
            );

            return (
                "SUPPORT_SESSION_UPDATED:"
                + session.getId()
                + ":"
                + Integer.toUnsignedString(fingerprint)
            );
        }

        return type.name() + ":" + session.getId();
    }

    private String notificationTitle(
            LearnerNotificationType notificationType
    ) {
        return switch (notificationType) {
            case SUPPORT_SESSION_CREATED,
                 SUPPORT_SESSION_SCHEDULED ->
                "Nouvelle seance planifiee";

            case SUPPORT_SESSION_UPDATED ->
                "Seance modifiee";

            case SUPPORT_SESSION_CANCELLED ->
                "Seance annulee";

            case TRAINING_INVITATION ->
                "Nouvelle invitation";

            case TRAINING_ASSIGNED ->
                "Nouvelle formation affectee";

            case ACCESS_REQUEST_DECISION ->
                "Decision sur votre demande d'acces";

            case FEEDBACK_RESPONSE ->
                "Reponse a votre feedback";

            case DEADLINE_ASSIGNED ->
                "Echeance de formation";

            case ACCOUNT_DELETION_REQUESTED ->
                "Demande de suppression de compte";

            case ACCOUNT_DELETION_STATUS_UPDATED ->
                "Mise a jour de suppression de compte";
        };
    }

    private String notificationMessage(
            LearnerNotificationType notificationType,
            String sessionTitle
    ) {
        String title =
            sessionTitle == null || sessionTitle.isBlank()
                ? "Seance d'accompagnement"
                : sessionTitle.trim();

        return switch (notificationType) {
            case SUPPORT_SESSION_CREATED,
                 SUPPORT_SESSION_SCHEDULED ->
                "Une nouvelle seance a ete planifiee : " + title;

            case SUPPORT_SESSION_UPDATED ->
                "Votre seance a ete modifiee : " + title;

            case SUPPORT_SESSION_CANCELLED ->
                "Votre seance a ete annulee : " + title;

            default ->
                "Une nouvelle notification est disponible.";
        };
    }

    private String cleanRequired(
            String value,
            String field
    ) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                field + " est obligatoire."
            );
        }

        return value.trim();
    }

    private String cleanNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
