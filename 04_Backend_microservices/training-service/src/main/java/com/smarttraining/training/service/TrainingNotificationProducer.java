package com.smarttraining.training.service;

import com.smarttraining.training.client.AnalyticsNotificationInternalClient;
import com.smarttraining.training.dto.EnrollmentResponse;
import com.smarttraining.training.dto.TrainingAccessRequestResponse;
import com.smarttraining.training.dto.TrainingInvitationResponse;
import java.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class TrainingNotificationProducer {

    private static final Logger LOGGER =
        LoggerFactory.getLogger(
            TrainingNotificationProducer.class
        );

    private static final DateTimeFormatter DEADLINE_FORMAT =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final AnalyticsNotificationInternalClient client;

    public TrainingNotificationProducer(
            AnalyticsNotificationInternalClient client
    ) {
        this.client = client;
    }

    public void notifyInvitation(
            TrainingInvitationResponse invitation
    ) {
        if (
            invitation == null
            || invitation.getId() == null
            || invitation.getLearnerId() == null
        ) {
            // Email-only invitation has no authenticated userId recipient.
            return;
        }

        String trainingTitle =
            safeTrainingTitle(
                invitation.getTrainingTitle()
            );

        deliver(
            invitation.getLearnerId(),
            invitation.getTrainingId(),
            "TRAINING_INVITATION",
            "Nouvelle invitation",
            "Vous etes invite a rejoindre la formation : "
                + trainingTitle,
            "/learner/invitations",
            "TRAINING_INVITATION:"
                + invitation.getId()
        );
    }

    public void notifyAssignment(
            EnrollmentResponse enrollment
    ) {
        if (
            enrollment == null
            || enrollment.getId() == null
            || enrollment.getLearnerId() == null
        ) {
            return;
        }

        String trainingTitle =
            safeTrainingTitle(
                enrollment.getTrainingTitle()
            );

        deliver(
            enrollment.getLearnerId(),
            enrollment.getTrainingId(),
            "TRAINING_ASSIGNED",
            "Nouvelle formation affectee",
            "Une formation vous a ete affectee : "
                + trainingTitle,
            "/learner/trainings/" + enrollment.getTrainingId(),
            "TRAINING_ASSIGNED:"
                + enrollment.getId()
        );
    }

    public void notifyDeadlineAssigned(
            EnrollmentResponse enrollment
    ) {
        if (
            enrollment == null
            || enrollment.getId() == null
            || enrollment.getLearnerId() == null
            || enrollment.getDueAt() == null
        ) {
            return;
        }

        String trainingTitle =
            safeTrainingTitle(
                enrollment.getTrainingTitle()
            );

        deliver(
            enrollment.getLearnerId(),
            enrollment.getTrainingId(),
            "DEADLINE_ASSIGNED",
            "\u00c9ch\u00e9ance de formation",
            "La formation "
                + trainingTitle
                + " est \u00e0 terminer avant le "
                + DEADLINE_FORMAT.format(
                    enrollment.getDueAt()
                )
                + ".",
            "/learner/trainings/" + enrollment.getTrainingId(),
            "DEADLINE_ASSIGNED:"
                + enrollment.getId()
        );
    }

    public void notifyAccessDecision(
            TrainingAccessRequestResponse request
    ) {
        if (
            request == null
            || request.getId() == null
            || request.getLearnerId() == null
            || request.getStatus() == null
        ) {
            return;
        }

        String status =
            request.getStatus().name();

        boolean approved =
            "APPROVED".equals(status);

        String trainingTitle =
            safeTrainingTitle(
                request.getTrainingTitle()
            );

        String message =
            approved
                ? "Votre demande d'acces a ete acceptee pour : "
                    + trainingTitle
                : "Votre demande d'acces a ete refusee pour : "
                    + trainingTitle;

        String actionUrl =
            approved
                ? "/learner/trainings"
                : "/learner/catalog";

        deliver(
            request.getLearnerId(),
            request.getTrainingId(),
            "ACCESS_REQUEST_DECISION",
            "Decision sur votre demande d'acces",
            message,
            actionUrl,
            "ACCESS_REQUEST_DECISION:"
                + request.getId()
                + ":"
                + status
        );
    }

    /*
     * These methods are called by controllers only after the transactional
     * business service returned successfully. Therefore the business
     * transaction has already committed. Delivery is best effort and never
     * rolls the business action back.
     */
    private void deliver(
            Long userId,
            Long trainingId,
            String notificationType,
            String title,
            String message,
            String actionUrl,
            String eventKey
    ) {
        try {
            client.create(
                userId,
                trainingId,
                notificationType,
                title,
                message,
                actionUrl,
                eventKey
            );
        }
        catch (Exception exception) {
            LOGGER.warn(
                "Notification interne non livree eventKey={}: {}",
                eventKey,
                exception.getMessage()
            );
        }
    }

    private String safeTrainingTitle(String value) {
        if (value == null || value.isBlank()) {
            return "Formation SmartTraining";
        }

        return value.trim();
    }
}