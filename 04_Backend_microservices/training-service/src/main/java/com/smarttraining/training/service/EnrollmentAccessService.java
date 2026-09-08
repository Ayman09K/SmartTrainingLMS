package com.smarttraining.training.service;

import com.smarttraining.training.dto.AccessCodeEnrollmentRequest;
import com.smarttraining.training.dto.EnrollmentResponse;
import com.smarttraining.training.dto.SelfEnrollmentRequest;
import com.smarttraining.training.dto.TrainingAccessRequestCreateRequest;
import com.smarttraining.training.dto.TrainingAccessRequestDecisionRequest;
import com.smarttraining.training.dto.TrainingAccessRequestResponse;
import com.smarttraining.training.dto.TrainingAssignmentRequest;
import com.smarttraining.training.dto.TrainingInvitationAcceptRequest;
import com.smarttraining.training.dto.TrainingInvitationCreateRequest;
import com.smarttraining.training.dto.TrainingInvitationResponse;
import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.entity.TrainingAccessRequest;
import com.smarttraining.training.entity.TrainingInvitation;
import com.smarttraining.training.enums.EnrollmentMode;
import com.smarttraining.training.enums.EnrollmentSource;
import com.smarttraining.training.enums.EnrollmentStatus;
import com.smarttraining.training.enums.TrainingAccessRequestStatus;
import com.smarttraining.training.enums.TrainingInvitationStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import com.smarttraining.training.repository.EnrollmentRepository;
import com.smarttraining.training.repository.TrainingAccessRequestRepository;
import com.smarttraining.training.repository.TrainingInvitationRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.AuthenticatedUserService;
import com.smarttraining.training.security.TrainingOwnershipService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EnrollmentAccessService {

    private final TrainingRepository trainingRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TrainingAccessRequestRepository accessRequestRepository;
    private final TrainingInvitationRepository invitationRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final TrainingOwnershipService ownershipService;

    public EnrollmentAccessService(
            TrainingRepository trainingRepository,
            EnrollmentRepository enrollmentRepository,
            TrainingAccessRequestRepository accessRequestRepository,
            TrainingInvitationRepository invitationRepository,
            AuthenticatedUserService authenticatedUserService,
            TrainingOwnershipService ownershipService
    ) {
        this.trainingRepository = trainingRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.accessRequestRepository = accessRequestRepository;
        this.invitationRepository = invitationRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.ownershipService = ownershipService;
    }

    @Transactional
    public EnrollmentResponse selfEnroll(SelfEnrollmentRequest request) {
        requireLearner();
        Long learnerId = authenticatedUserService.getUserId();
        Training training = findTraining(request.getTrainingId());

        if (!training.isPublished()) {
            throw new IllegalArgumentException("La formation n'est pas publiee");
        }

        if (training.getVisibility() != TrainingVisibility.PUBLIC) {
            throw new IllegalArgumentException(
                    "Cette formation n'est pas ouverte a l'inscription libre"
            );
        }

        if (training.getEnrollmentMode() != EnrollmentMode.SELF_ENROLLMENT) {
            throw new IllegalArgumentException(
                    "L'inscription libre n'est pas activee pour cette formation"
            );
        }

        Enrollment enrollment = createEnrollment(
                learnerId,
                training,
                EnrollmentSource.SELF_ENROLLMENT,
                null,
                null,
                null,
                null
        );

        return new EnrollmentResponse(enrollment);
    }

    @Transactional
    public EnrollmentResponse selfUnenroll(Long trainingId) {
        requireLearner();
        Long learnerId = authenticatedUserService.getUserId();

        Enrollment enrollment = enrollmentRepository
                .findByLearnerIdAndTrainingId(learnerId, trainingId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Inscription introuvable"
                ));

        if (!canSelfUnenroll(enrollment)) {
            throw new AccessDeniedException(
                    "Cette formation a ete attribuee par votre organisation et ne peut pas etre quittee librement"
            );
        }

        enrollment.cancel();
        return new EnrollmentResponse(enrollmentRepository.save(enrollment));
    }

    @Transactional
    public EnrollmentResponse enrollWithAccessCode(
            AccessCodeEnrollmentRequest request
    ) {
        requireLearner();
        Long learnerId = authenticatedUserService.getUserId();
        Training training = findTraining(request.getTrainingId());

        if (!training.isPublished()) {
            throw new IllegalArgumentException("La formation n'est pas publiee");
        }

        if (training.getEnrollmentMode() != EnrollmentMode.ACCESS_CODE) {
            throw new IllegalArgumentException(
                    "Cette formation ne fonctionne pas par code d'acces"
            );
        }

        if (training.getAccessCode() == null || training.getAccessCode().isBlank()) {
            throw new IllegalArgumentException(
                    "Aucun code d'acces n'est configure pour cette formation"
            );
        }

        if (!training.getAccessCode().equals(request.getAccessCode())) {
            throw new IllegalArgumentException("Code d'acces incorrect");
        }

        Enrollment enrollment = createEnrollment(
                learnerId,
                training,
                EnrollmentSource.ACCESS_CODE,
                null,
                request.getAccessCode(),
                null,
                null
        );

        return new EnrollmentResponse(enrollment);
    }

    @Transactional
    public List<EnrollmentResponse> assignLearners(
            TrainingAssignmentRequest request
    ) {
        ownershipService.requireAdminOrTrainer();

        Training training = findTraining(request.getTrainingId());
        ownershipService.assertCanManageTraining(training);

        Long assignedBy = ownershipService.getActorId();

        validateDueAt(request.getDueAt());

        EnrollmentSource source = ownershipService.isAdmin()
                ? EnrollmentSource.ADMIN_ASSIGNMENT
                : EnrollmentSource.TRAINER_ASSIGNMENT;

        return request.getLearnerIds()
                .stream()
                .map(learnerId -> createEnrollment(
                        learnerId,
                        training,
                        source,
                        assignedBy,
                        null,
                        null,
                        request.getDueAt()
                ))
                .map(EnrollmentResponse::new)
                .toList();
    }

    @Transactional
    public TrainingAccessRequestResponse createAccessRequest(
            TrainingAccessRequestCreateRequest request
    ) {
        requireLearner();

        Long learnerId = authenticatedUserService.getUserId();
        Training training = findTraining(request.getTrainingId());

        if (enrollmentRepository.existsByLearnerIdAndTrainingId(
                learnerId,
                request.getTrainingId()
        )) {
            throw new IllegalArgumentException(
                    "L'apprenant est deja inscrit a cette formation"
            );
        }

        boolean pendingExists =
                accessRequestRepository.existsByLearnerIdAndTrainingIdAndStatus(
                        learnerId,
                        request.getTrainingId(),
                        TrainingAccessRequestStatus.PENDING
                );

        if (pendingExists) {
            throw new IllegalArgumentException(
                    "Une demande d'acces est deja en attente pour cette formation"
            );
        }

        TrainingAccessRequest accessRequest = new TrainingAccessRequest();
        accessRequest.setLearnerId(learnerId);
        accessRequest.setTraining(training);
        accessRequest.setLearnerMessage(request.getLearnerMessage());
        accessRequest.setStatus(TrainingAccessRequestStatus.PENDING);

        TrainingAccessRequest savedRequest =
                accessRequestRepository.save(accessRequest);

        return new TrainingAccessRequestResponse(savedRequest);
    }

    public List<TrainingAccessRequestResponse> getAccessRequestsByLearner(
            Long learnerId
    ) {
        String role = authenticatedUserService.getRole();
        Long actorId = authenticatedUserService.getUserId();

        if ("APPRENANT".equals(role)) {
            if (!actorId.equals(learnerId)) {
                throw new AccessDeniedException(
                        "Un apprenant ne peut consulter que ses propres demandes"
                );
            }

            return accessRequestRepository.findByLearnerIdWithTraining(learnerId)
                    .stream()
                    .map(TrainingAccessRequestResponse::new)
                    .toList();
        }

        if ("ADMIN".equals(role)) {
            return accessRequestRepository.findByLearnerIdWithTraining(learnerId)
                    .stream()
                    .map(TrainingAccessRequestResponse::new)
                    .toList();
        }

        if ("FORMATEUR".equals(role)) {
            return accessRequestRepository.findManagedByLearnerIdWithTraining(
                            learnerId,
                            actorId
                    )
                    .stream()
                    .map(TrainingAccessRequestResponse::new)
                    .toList();
        }

        throw new AccessDeniedException("Role non autorise");
    }

    public List<TrainingAccessRequestResponse> getAccessRequestsByTraining(
            Long trainingId
    ) {
        ownershipService.assertCanManageTrainingId(trainingId);

        return accessRequestRepository.findByTrainingIdWithTraining(trainingId)
                .stream()
                .map(TrainingAccessRequestResponse::new)
                .toList();
    }

    public List<TrainingAccessRequestResponse> getPendingAccessRequests() {
        ownershipService.requireAdminOrTrainer();

        List<TrainingAccessRequest> requests = ownershipService.isAdmin()
                ? accessRequestRepository.findByStatusWithTraining(
                        TrainingAccessRequestStatus.PENDING
                )
                : accessRequestRepository.findManagedByStatusWithTraining(
                        TrainingAccessRequestStatus.PENDING,
                        ownershipService.getActorId()
                );

        return requests.stream()
                .map(TrainingAccessRequestResponse::new)
                .toList();
    }

    @Transactional
    public TrainingAccessRequestResponse approveAccessRequest(
            Long requestId,
            TrainingAccessRequestDecisionRequest decision
    ) {
        ownershipService.requireAdminOrTrainer();
        assertCanManageAccessRequest(requestId);

        Long decidedBy = ownershipService.getActorId();
        TrainingAccessRequest accessRequest = findAccessRequest(requestId);

        if (accessRequest.getStatus() != TrainingAccessRequestStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Cette demande n'est plus en attente"
            );
        }

        Enrollment enrollment = createEnrollment(
                accessRequest.getLearnerId(),
                accessRequest.getTraining(),
                EnrollmentSource.APPROVED_REQUEST,
                decidedBy,
                null,
                null,
                null
        );

        accessRequest.approve(
                decidedBy,
                decision.getDecisionComment(),
                enrollment.getId()
        );

        TrainingAccessRequest savedRequest =
                accessRequestRepository.save(accessRequest);

        return new TrainingAccessRequestResponse(savedRequest);
    }

    @Transactional
    public TrainingAccessRequestResponse rejectAccessRequest(
            Long requestId,
            TrainingAccessRequestDecisionRequest decision
    ) {
        ownershipService.requireAdminOrTrainer();
        assertCanManageAccessRequest(requestId);

        Long decidedBy = ownershipService.getActorId();
        TrainingAccessRequest accessRequest = findAccessRequest(requestId);

        if (accessRequest.getStatus() != TrainingAccessRequestStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Cette demande n'est plus en attente"
            );
        }

        accessRequest.reject(decidedBy, decision.getDecisionComment());

        TrainingAccessRequest savedRequest =
                accessRequestRepository.save(accessRequest);

        return new TrainingAccessRequestResponse(savedRequest);
    }

    @Transactional
    public TrainingInvitationResponse createInvitation(
            TrainingInvitationCreateRequest request
    ) {
        ownershipService.requireAdminOrTrainer();

        Training training = findTraining(request.getTrainingId());
        ownershipService.assertCanManageTraining(training);

        if (request.getLearnerId() == null
                && (request.getLearnerEmail() == null
                    || request.getLearnerEmail().isBlank())) {
            throw new IllegalArgumentException(
                    "L'invitation doit contenir un learnerId ou un email apprenant"
            );
        }

        TrainingInvitation invitation = new TrainingInvitation();
        invitation.setTraining(training);
        invitation.setLearnerId(request.getLearnerId());
        invitation.setLearnerEmail(request.getLearnerEmail());
        invitation.setInvitedBy(ownershipService.getActorId());
        invitation.setMessage(request.getMessage());
        invitation.setToken(UUID.randomUUID().toString());
        invitation.setStatus(TrainingInvitationStatus.PENDING);

        int validityDays =
                request.getValidityDays() == null
                        || request.getValidityDays() <= 0
                ? 30
                : request.getValidityDays();

        invitation.setExpiresAt(LocalDateTime.now().plusDays(validityDays));

        TrainingInvitation savedInvitation =
                invitationRepository.save(invitation);

        return new TrainingInvitationResponse(savedInvitation);
    }

    public List<TrainingInvitationResponse> getInvitationsByTraining(
            Long trainingId
    ) {
        ownershipService.assertCanManageTrainingId(trainingId);

        return invitationRepository.findByTrainingIdWithTraining(trainingId)
                .stream()
                .map(TrainingInvitationResponse::new)
                .toList();
    }

    public List<TrainingInvitationResponse> getInvitationsByLearner(
            Long learnerId
    ) {
        String role = authenticatedUserService.getRole();
        Long actorId = authenticatedUserService.getUserId();

        if ("APPRENANT".equals(role)) {
            if (!actorId.equals(learnerId)) {
                throw new AccessDeniedException(
                        "Un apprenant ne peut consulter que ses propres invitations"
                );
            }

            return invitationRepository.findByLearnerIdWithTraining(learnerId)
                    .stream()
                    .map(TrainingInvitationResponse::new)
                    .toList();
        }

        if ("ADMIN".equals(role)) {
            return invitationRepository.findByLearnerIdWithTraining(learnerId)
                    .stream()
                    .map(TrainingInvitationResponse::new)
                    .toList();
        }

        if ("FORMATEUR".equals(role)) {
            return invitationRepository.findManagedByLearnerIdWithTraining(
                            learnerId,
                            actorId
                    )
                    .stream()
                    .map(TrainingInvitationResponse::new)
                    .toList();
        }

        throw new AccessDeniedException("Role non autorise");
    }

    public List<TrainingInvitationResponse> getInvitationsByLearnerEmail(
            String email
    ) {
        String role = authenticatedUserService.getRole();

        if ("APPRENANT".equals(role)) {
            String ownEmail = authenticatedUserService.getSubject();

            if (email == null || !ownEmail.equalsIgnoreCase(email)) {
                throw new AccessDeniedException(
                        "Un apprenant ne peut consulter que ses propres invitations"
                );
            }

            return invitationRepository.findByLearnerEmailWithTraining(email)
                    .stream()
                    .map(TrainingInvitationResponse::new)
                    .toList();
        }

        if ("ADMIN".equals(role)) {
            return invitationRepository.findByLearnerEmailWithTraining(email)
                    .stream()
                    .map(TrainingInvitationResponse::new)
                    .toList();
        }

        if ("FORMATEUR".equals(role)) {
            return invitationRepository.findManagedByLearnerEmailWithTraining(
                            email,
                            authenticatedUserService.getUserId()
                    )
                    .stream()
                    .map(TrainingInvitationResponse::new)
                    .toList();
        }

        throw new AccessDeniedException("Role non autorise");
    }

    public List<TrainingInvitationResponse> getPendingInvitations() {
        ownershipService.requireAdminOrTrainer();

        List<TrainingInvitation> invitations = ownershipService.isAdmin()
                ? invitationRepository.findByStatusWithTraining(
                        TrainingInvitationStatus.PENDING
                )
                : invitationRepository.findManagedByStatusWithTraining(
                        TrainingInvitationStatus.PENDING,
                        ownershipService.getActorId()
                );

        return invitations.stream()
                .map(TrainingInvitationResponse::new)
                .toList();
    }

    @Transactional
    public TrainingInvitationResponse acceptInvitation(
            TrainingInvitationAcceptRequest request
    ) {
        requireLearner();

        Long learnerId = authenticatedUserService.getUserId();
        String authenticatedEmail = authenticatedUserService.getSubject();

        TrainingInvitation invitation =
                invitationRepository.findByTokenWithTraining(request.getToken())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Invitation introuvable"
                                )
                        );

        assertInvitationTargetsAuthenticatedLearner(
                invitation,
                learnerId,
                authenticatedEmail
        );

        if (invitation.getStatus() != TrainingInvitationStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Cette invitation n'est plus en attente"
            );
        }

        if (invitation.isExpired()) {
            invitation.expire();
            invitationRepository.save(invitation);
            throw new IllegalArgumentException("Cette invitation est expiree");
        }

        Enrollment enrollment = createEnrollment(
                learnerId,
                invitation.getTraining(),
                EnrollmentSource.INVITATION,
                invitation.getInvitedBy(),
                null,
                invitation.getToken(),
                null
        );

        invitation.accept(learnerId, enrollment.getId());

        TrainingInvitation savedInvitation =
                invitationRepository.save(invitation);

        return new TrainingInvitationResponse(savedInvitation);
    }

    @Transactional
    public TrainingInvitationResponse declineInvitation(Long invitationId) {
        requireLearner();

        TrainingInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Invitation introuvable")
                );

        assertInvitationTargetsAuthenticatedLearner(
                invitation,
                authenticatedUserService.getUserId(),
                authenticatedUserService.getSubject()
        );

        if (invitation.getStatus() != TrainingInvitationStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Cette invitation n'est plus en attente"
            );
        }

        invitation.decline();

        TrainingInvitation savedInvitation =
                invitationRepository.save(invitation);

        return new TrainingInvitationResponse(savedInvitation);
    }

    @Transactional
    public TrainingInvitationResponse cancelInvitation(Long invitationId) {
        ownershipService.requireAdminOrTrainer();

        if (!ownershipService.isAdmin()
                && invitationRepository.countManageableInvitation(
                        invitationId,
                        ownershipService.getActorId()
                ) == 0) {
            throw new AccessDeniedException(
                    "Vous ne pouvez annuler que les invitations de vos formations"
            );
        }

        TrainingInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Invitation introuvable")
                );

        if (invitation.getStatus() != TrainingInvitationStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Cette invitation n'est plus en attente"
            );
        }

        invitation.cancel();

        TrainingInvitation savedInvitation =
                invitationRepository.save(invitation);

        return new TrainingInvitationResponse(savedInvitation);
    }

    private void assertCanManageAccessRequest(Long requestId) {
        if (ownershipService.isAdmin()) {
            return;
        }

        if (accessRequestRepository.countManageableRequest(
                requestId,
                ownershipService.getActorId()
        ) == 0) {
            throw new AccessDeniedException(
                    "Vous ne pouvez traiter que les demandes de vos formations"
            );
        }
    }

    private void assertInvitationTargetsAuthenticatedLearner(
            TrainingInvitation invitation,
            Long learnerId,
            String authenticatedEmail
    ) {
        if (invitation.getLearnerId() != null
                && !invitation.getLearnerId().equals(learnerId)) {
            throw new AccessDeniedException(
                    "Cette invitation ne correspond pas a cet apprenant"
            );
        }

        if (invitation.getLearnerEmail() != null
                && !invitation.getLearnerEmail().isBlank()
                && !invitation.getLearnerEmail()
                        .equalsIgnoreCase(authenticatedEmail)) {
            throw new AccessDeniedException(
                    "Cette invitation ne correspond pas a l'utilisateur authentifie"
            );
        }
    }

    @Transactional(readOnly = true)
    public boolean canSelfUnenroll(Enrollment enrollment) {
        if (enrollment == null
                || enrollment.getTraining() == null
                || enrollment.getStatus() == EnrollmentStatus.CANCELLED
                || enrollment.getSource() != EnrollmentSource.SELF_ENROLLMENT
                || enrollment.getAssignedBy() != null
                || enrollment.getDueAt() != null) {
            return false;
        }

        return enrollmentRepository.countLearningPathRequirements(
                enrollment.getLearnerId(),
                enrollment.getTraining().getId()
        ) == 0;
    }

    private void requireLearner() {
        String role = authenticatedUserService.getRole();

        if (!"APPRENANT".equals(role)
                && !"FORMATEUR".equals(role)
                && !"ADMIN".equals(role)) {
            throw new AccessDeniedException(
                    "Cette action necessite une identite utilisateur pouvant suivre une formation"
            );
        }
    }

    private Enrollment createEnrollment(
            Long learnerId,
            Training training,
            EnrollmentSource source,
            Long assignedBy,
            String accessCodeUsed,
            String invitationToken,
            LocalDateTime dueAt
    ) {
        Enrollment enrollment = enrollmentRepository
                .findByLearnerIdAndTrainingId(learnerId, training.getId())
                .map(existing -> {
                    if (existing.getStatus() != EnrollmentStatus.CANCELLED) {
                        throw new IllegalArgumentException(
                                "Cet apprenant est deja inscrit a cette formation"
                        );
                    }

                    existing.reactivate();
                    return existing;
                })
                .orElseGet(() -> new Enrollment(learnerId, training, source));

        enrollment.setSource(source);
        enrollment.setAssignedBy(assignedBy);
        enrollment.setAccessCodeUsed(accessCodeUsed);
        enrollment.setInvitationToken(invitationToken);
        enrollment.setDueAt(dueAt);

        return enrollmentRepository.save(enrollment);
    }

    private void validateDueAt(LocalDateTime dueAt) {
        if (dueAt != null && !dueAt.isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "L'echeance doit etre dans le futur"
            );
        }
    }

    private Training findTraining(Long trainingId) {
        return trainingRepository.findById(trainingId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Formation introuvable")
                );
    }

    private TrainingAccessRequest findAccessRequest(Long requestId) {
        return accessRequestRepository.findById(requestId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Demande d'acces introuvable"
                        )
                );
    }
}
