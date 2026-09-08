package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.SupportSessionRequest;
import com.smarttraining.analytics.dto.SupportSessionResponse;
import com.smarttraining.analytics.entity.SupportSession;
import com.smarttraining.analytics.enums.LearnerNotificationType;
import com.smarttraining.analytics.repository.SupportSessionRepository;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.security.TrainerLearnerAccessGuard;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SupportSessionService {

    private final SupportSessionRepository repository;
    private final TrainerLearnerAccessGuard accessGuard;
    private final LearnerNotificationService notificationService;

    public SupportSessionService(
            SupportSessionRepository repository,
            TrainerLearnerAccessGuard accessGuard,
            LearnerNotificationService notificationService
    ) {
        this.repository = repository;
        this.accessGuard = accessGuard;
        this.notificationService = notificationService;
    }

    public SupportSessionResponse create(
            SupportSessionRequest request,
            AuthenticatedUser actor
    ) {
        requireTrainer(actor);
        requireTrainingAccess(actor, request.getLearnerId(), request.getTrainingId());

        SupportSession session = new SupportSession(
            request.getLearnerId(),
            actor.getUserId(),
            request.getTrainingId(),
            clean(request.getTitle()),
            clean(request.getObjective()),
            request.getScheduledAt(),
            clean(request.getMeetingLink()),
            cleanNullable(request.getNote())
        );

        SupportSession saved = repository.save(session);
        notificationService.notifySupportSession(
            saved,
            LearnerNotificationType.SUPPORT_SESSION_CREATED
        );
        return new SupportSessionResponse(saved);
    }

    public SupportSessionResponse update(
            Long sessionId,
            SupportSessionRequest request,
            AuthenticatedUser actor
    ) {
        SupportSession session = getEntity(sessionId);
        requireTrainerOwns(actor, session);
        requireTrainingAccess(actor, request.getLearnerId(), request.getTrainingId());

        session.updateSchedule(
            request.getLearnerId(),
            request.getTrainingId(),
            clean(request.getTitle()),
            clean(request.getObjective()),
            request.getScheduledAt(),
            clean(request.getMeetingLink()),
            cleanNullable(request.getNote())
        );

        SupportSession saved = repository.save(session);
        notificationService.notifySupportSession(
            saved,
            LearnerNotificationType.SUPPORT_SESSION_UPDATED
        );
        return new SupportSessionResponse(saved);
    }

    public SupportSessionResponse complete(
            Long sessionId,
            AuthenticatedUser actor
    ) {
        SupportSession session = getEntity(sessionId);
        requireTrainerOwns(actor, session);
        session.markCompleted();
        return new SupportSessionResponse(repository.save(session));
    }

    public SupportSessionResponse cancel(
            Long sessionId,
            AuthenticatedUser actor
    ) {
        SupportSession session = getEntity(sessionId);
        requireTrainerOwns(actor, session);
        session.markCancelled();
        SupportSession saved = repository.save(session);
        notificationService.notifySupportSession(
            saved,
            LearnerNotificationType.SUPPORT_SESSION_CANCELLED
        );
        return new SupportSessionResponse(saved);
    }

    @Transactional(readOnly = true)
    public SupportSessionResponse getById(
            Long sessionId,
            AuthenticatedUser actor
    ) {
        SupportSession session = getEntity(sessionId);

        if (actor != null
                && actor.getUserId().equals(session.getLearnerId())) {
            return new SupportSessionResponse(session);
        }

        if (actor != null && "APPRENANT".equals(actor.getRole())) {
            throw new AccessDeniedException(
                "Un apprenant ne peut consulter que ses propres seances."
            );
        }

        requireEducatorReadAccess(actor, session);
        return new SupportSessionResponse(session);
    }

    @Transactional(readOnly = true)
    public List<SupportSessionResponse> getMine(AuthenticatedUser actor) {
        if (actor == null
                || (!"APPRENANT".equals(actor.getRole())
                && !"FORMATEUR".equals(actor.getRole())
                && !"ADMIN".equals(actor.getRole()))) {
            throw new AccessDeniedException(
                "Cette route self-service necessite une identite utilisateur pouvant suivre une formation."
            );
        }

        return repository
            .findByLearnerIdOrderByScheduledAtDesc(actor.getUserId())
            .stream()
            .map(SupportSessionResponse::new)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<SupportSessionResponse> getForCurrentTrainer(
            AuthenticatedUser actor
    ) {
        if (actor == null) {
            throw new AccessDeniedException("Utilisateur authentifie obligatoire.");
        }

        if ("ADMIN".equals(actor.getRole())) {
            return repository
                .findAllByOrderByScheduledAtDesc()
                .stream()
                .map(SupportSessionResponse::new)
                .toList();
        }

        requireTrainer(actor);

        return repository
            .findByTrainerIdOrderByScheduledAtDesc(actor.getUserId())
            .stream()
            .map(SupportSessionResponse::new)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<SupportSessionResponse> getForLearner(
            Long learnerId,
            AuthenticatedUser actor
    ) {
        if (actor == null || !actor.isEducator()) {
            throw new AccessDeniedException(
                "Acces reserve au formateur ou a l'administrateur."
            );
        }

        List<SupportSession> sessions =
            repository.findByLearnerIdOrderByScheduledAtDesc(learnerId);

        if ("ADMIN".equals(actor.getRole())) {
            return sessions.stream()
                .map(SupportSessionResponse::new)
                .toList();
        }

        List<Long> allowedTrainingIds = accessGuard.requireAccess(actor, learnerId);

        return sessions.stream()
            .filter(session -> allowedTrainingIds.contains(session.getTrainingId()))
            .map(SupportSessionResponse::new)
            .toList();
    }

    private SupportSession getEntity(Long sessionId) {
        return repository.findById(sessionId)
            .orElseThrow(() -> new IllegalArgumentException(
                "Seance d'accompagnement introuvable avec id=" + sessionId
            ));
    }

    private void requireTrainer(AuthenticatedUser actor) {
        if (actor == null || !"FORMATEUR".equals(actor.getRole())) {
            throw new AccessDeniedException(
                "Cette action est reservee au formateur."
            );
        }
    }

    private void requireTrainingAccess(
            AuthenticatedUser actor,
            Long learnerId,
            Long trainingId
    ) {
        requireTrainer(actor);

        List<Long> allowedTrainingIds = accessGuard.requireAccess(actor, learnerId);

        if (!allowedTrainingIds.contains(trainingId)) {
            throw new AccessDeniedException(
                "Ce formateur ne suit pas cet apprenant pour cette formation."
            );
        }
    }

    private void requireTrainerOwns(
            AuthenticatedUser actor,
            SupportSession session
    ) {
        requireTrainer(actor);

        if (!actor.getUserId().equals(session.getTrainerId())) {
            throw new AccessDeniedException(
                "Un formateur ne peut modifier que les seances qu'il a planifiees."
            );
        }

        requireTrainingAccess(
            actor,
            session.getLearnerId(),
            session.getTrainingId()
        );
    }

    private void requireEducatorReadAccess(
            AuthenticatedUser actor,
            SupportSession session
    ) {
        if (actor == null || !actor.isEducator()) {
            throw new AccessDeniedException(
                "Acces reserve au formateur ou a l'administrateur."
            );
        }

        if ("ADMIN".equals(actor.getRole())) {
            return;
        }

        List<Long> allowedTrainingIds =
            accessGuard.requireAccess(actor, session.getLearnerId());

        if (!allowedTrainingIds.contains(session.getTrainingId())) {
            throw new AccessDeniedException(
                "Cette seance ne concerne pas une formation suivie par ce formateur."
            );
        }
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }

    private String cleanNullable(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }
}
