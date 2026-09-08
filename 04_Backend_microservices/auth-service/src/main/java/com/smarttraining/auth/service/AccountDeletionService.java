package com.smarttraining.auth.service;

import com.smarttraining.auth.dto.AccountDeletionAdminResponse;
import com.smarttraining.auth.dto.AccountDeletionRequestResponse;
import com.smarttraining.auth.entity.AccountDeletionRequest;
import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.enums.AccountDeletionRequestStatus;
import com.smarttraining.auth.enums.UserRole;
import com.smarttraining.auth.event.AccountDeletionNotificationEvent;
import com.smarttraining.auth.repository.AccountDeletionRequestRepository;
import com.smarttraining.auth.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountDeletionService {

    private static final Set<AccountDeletionRequestStatus> ACTIVE_STATUSES =
            EnumSet.of(
                AccountDeletionRequestStatus.PENDING,
                AccountDeletionRequestStatus.IN_PROGRESS
            );

    private final UserRepository userRepository;
    private final AccountDeletionRequestRepository requestRepository;
    private final ApplicationEventPublisher eventPublisher;

    public AccountDeletionService(
            UserRepository userRepository,
            AccountDeletionRequestRepository requestRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.userRepository = userRepository;
        this.requestRepository = requestRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public Optional<AccountDeletionRequestResponse> getLatest(String authenticatedEmail) {
        User user = requireUser(authenticatedEmail);

        return requestRepository
                .findFirstByUserIdOrderByRequestedAtDesc(user.getId())
                .map(AccountDeletionRequestResponse::new);
    }

    @Transactional
    public AccountDeletionRequestResponse requestDeletion(String authenticatedEmail) {
        User user = requireUser(authenticatedEmail);

        Optional<AccountDeletionRequest> existing =
                requestRepository.findFirstByUserIdAndStatusInOrderByRequestedAtDesc(
                    user.getId(),
                    ACTIVE_STATUSES
                );

        if (existing.isPresent()) {
            return new AccountDeletionRequestResponse(existing.get());
        }

        AccountDeletionRequest created =
                requestRepository.save(
                    new AccountDeletionRequest(
                        user.getId(),
                        user.getEmail(),
                        user.getRole().name(),
                        displayName(user)
                    )
                );

        eventPublisher.publishEvent(
            event(created, AccountDeletionRequestStatus.PENDING, true)
        );

        return new AccountDeletionRequestResponse(created);
    }

    @Transactional
    public AccountDeletionRequestResponse cancelPending(String authenticatedEmail) {
        User user = requireUser(authenticatedEmail);

        AccountDeletionRequest request =
                requestRepository
                    .findFirstByUserIdOrderByRequestedAtDesc(user.getId())
                    .orElseThrow(() -> new IllegalArgumentException(
                        "Aucune demande de suppression a annuler."
                    ));

        if (request.getStatus() != AccountDeletionRequestStatus.PENDING) {
            throw new IllegalArgumentException(
                request.getStatus() == AccountDeletionRequestStatus.IN_PROGRESS
                    ? "La demande est deja prise en charge et ne peut plus etre annulee depuis le compte."
                    : "Cette demande n'est plus annulable."
            );
        }

        request.setStatus(AccountDeletionRequestStatus.CANCELLED);
        request.setProcessedAt(LocalDateTime.now());

        AccountDeletionRequest saved = requestRepository.save(request);

        eventPublisher.publishEvent(
            event(saved, AccountDeletionRequestStatus.CANCELLED, true)
        );

        return new AccountDeletionRequestResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AccountDeletionAdminResponse> listForAdmin(
            String authenticatedEmail,
            AccountDeletionRequestStatus status
    ) {
        requireAdmin(authenticatedEmail);

        List<AccountDeletionRequest> rows =
                status == null
                    ? requestRepository.findAllByOrderByRequestedAtDesc()
                    : requestRepository.findByStatusOrderByRequestedAtDesc(status);

        return rows.stream()
                .map(AccountDeletionAdminResponse::new)
                .toList();
    }

    @Transactional
    public AccountDeletionAdminResponse startProcessing(
            String authenticatedEmail,
            Long requestId
    ) {
        User admin = requireAdmin(authenticatedEmail);
        AccountDeletionRequest request = requireRequest(requestId);
        preventSelfProcessing(admin, request);
        requireStatus(request, AccountDeletionRequestStatus.PENDING);

        request.setStatus(AccountDeletionRequestStatus.IN_PROGRESS);
        request.setProcessingStartedAt(LocalDateTime.now());
        setHandler(request, admin);

        AccountDeletionRequest saved = requestRepository.save(request);

        eventPublisher.publishEvent(
            event(saved, AccountDeletionRequestStatus.IN_PROGRESS, false)
        );

        return new AccountDeletionAdminResponse(saved);
    }

    @Transactional
    public AccountDeletionAdminResponse reject(
            String authenticatedEmail,
            Long requestId,
            String adminComment
    ) {
        User admin = requireAdmin(authenticatedEmail);
        AccountDeletionRequest request = requireRequest(requestId);
        preventSelfProcessing(admin, request);
        requireStatus(request, AccountDeletionRequestStatus.IN_PROGRESS);

        request.setStatus(AccountDeletionRequestStatus.REJECTED);
        request.setAdminComment(cleanRequired(adminComment, "Commentaire administrateur"));
        request.setProcessedAt(LocalDateTime.now());
        setHandler(request, admin);

        AccountDeletionRequest saved = requestRepository.save(request);

        eventPublisher.publishEvent(
            event(saved, AccountDeletionRequestStatus.REJECTED, false)
        );

        return new AccountDeletionAdminResponse(saved);
    }

    @Transactional
    public AccountDeletionAdminResponse complete(
            String authenticatedEmail,
            Long requestId,
            String adminComment,
            Boolean processingConfirmed
    ) {
        User admin = requireAdmin(authenticatedEmail);
        AccountDeletionRequest request = requireRequest(requestId);
        preventSelfProcessing(admin, request);
        requireStatus(request, AccountDeletionRequestStatus.IN_PROGRESS);

        if (!Boolean.TRUE.equals(processingConfirmed)) {
            throw new IllegalArgumentException(
                "La confirmation du traitement reel des donnees est obligatoire."
            );
        }

        request.setStatus(AccountDeletionRequestStatus.COMPLETED);
        request.setAdminComment(cleanRequired(adminComment, "Commentaire administrateur"));
        request.setProcessedAt(LocalDateTime.now());
        setHandler(request, admin);

        AccountDeletionRequest saved = requestRepository.save(request);

        eventPublisher.publishEvent(
            event(saved, AccountDeletionRequestStatus.COMPLETED, false)
        );

        return new AccountDeletionAdminResponse(saved);
    }

    private AccountDeletionRequest requireRequest(Long requestId) {
        if (requestId == null || requestId <= 0) {
            throw new IllegalArgumentException("Demande de suppression invalide.");
        }

        return requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException(
                    "Demande de suppression introuvable."
                ));
    }

    private void requireStatus(
            AccountDeletionRequest request,
            AccountDeletionRequestStatus expected
    ) {
        if (request.getStatus() != expected) {
            throw new IllegalArgumentException(
                "Transition impossible depuis le statut " + request.getStatus().name() + "."
            );
        }
    }

    private void preventSelfProcessing(User admin, AccountDeletionRequest request) {
        if (admin.getId().equals(request.getUserId())) {
            throw new IllegalArgumentException(
                "Un administrateur ne peut pas traiter sa propre demande de suppression."
            );
        }
    }

    private void setHandler(AccountDeletionRequest request, User admin) {
        request.setHandledByUserId(admin.getId());
        request.setHandledByEmailSnapshot(admin.getEmail());
    }

    private AccountDeletionNotificationEvent event(
            AccountDeletionRequest request,
            AccountDeletionRequestStatus status,
            boolean notifyAdmins
    ) {
        return new AccountDeletionNotificationEvent(
            request.getId(),
            request.getUserId(),
            request.getRoleSnapshot(),
            status,
            notifyAdmins
        );
    }

    private User requireAdmin(String authenticatedEmail) {
        User user = requireUser(authenticatedEmail);

        if (user.getRole() != UserRole.ADMIN) {
            throw new IllegalArgumentException(
                "Role ADMIN obligatoire pour traiter les demandes de suppression."
            );
        }

        return user;
    }

    private User requireUser(String authenticatedEmail) {
        if (authenticatedEmail == null || authenticatedEmail.isBlank()) {
            throw new IllegalArgumentException("Utilisateur non authentifie");
        }

        String email = authenticatedEmail.trim().toLowerCase(Locale.ROOT);

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(
                    "Utilisateur introuvable"
                ));
    }

    private String displayName(User user) {
        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String full = (first + " " + last).trim();
        return full.isBlank() ? user.getEmail() : full;
    }

    private String cleanRequired(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " obligatoire.");
        }
        return value.trim();
    }
}
