package com.smarttraining.analytics.security;

import com.smarttraining.analytics.integration.TrainingLearnerAccessClient;
import com.smarttraining.analytics.integration.TrainingLearnerAccessResponse;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class TrainerLearnerAccessGuard {

    private final TrainingLearnerAccessClient accessClient;

    public TrainerLearnerAccessGuard(
            TrainingLearnerAccessClient accessClient
    ) {
        this.accessClient = accessClient;
    }

    public List<Long> requireAccess(
            AuthenticatedUser actor,
            Long learnerId
    ) {
        if (actor == null) {
            throw new AccessDeniedException(
                    "Utilisateur authentifie obligatoire."
            );
        }

        if (
            !"FORMATEUR".equals(actor.getRole())
            && !"ADMIN".equals(actor.getRole())
        ) {
            throw new AccessDeniedException(
                    "Acces reserve a un formateur ou administrateur."
            );
        }

        TrainingLearnerAccessResponse response =
                accessClient.resolve(
                        actor.getUserId(),
                        actor.getRole(),
                        learnerId
                );

        if (
            !response.allowed()
            || response.trainingIds() == null
            || response.trainingIds().isEmpty()
        ) {
            throw new AccessDeniedException(
                    "Cet apprenant n'est pas suivi par ce formateur."
            );
        }

        return List.copyOf(response.trainingIds());
    }
}