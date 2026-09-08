package com.smarttraining.training.service;

import com.smarttraining.training.client.AuthInternalClient;
import com.smarttraining.training.client.InternalLearnerIdentityResponse;
import com.smarttraining.training.dto.CertificateVerificationResponse;
import com.smarttraining.training.dto.TrainingCertificateResponse;
import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.entity.TrainingCertificate;
import com.smarttraining.training.enums.CertificateStatus;
import com.smarttraining.training.enums.EnrollmentStatus;
import com.smarttraining.training.repository.EnrollmentRepository;
import com.smarttraining.training.repository.TrainingCertificateRepository;
import com.smarttraining.training.security.AuthenticatedUserService;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainingCertificateService {

    private static final SecureRandom RANDOM =
            new SecureRandom();

    private final TrainingCertificateRepository certificateRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final AuthInternalClient authInternalClient;
    private final TrainingCertificatePdfService pdfService;

    public TrainingCertificateService(
            TrainingCertificateRepository certificateRepository,
            EnrollmentRepository enrollmentRepository,
            AuthenticatedUserService authenticatedUserService,
            AuthInternalClient authInternalClient,
            TrainingCertificatePdfService pdfService
    ) {
        this.certificateRepository = certificateRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.authInternalClient = authInternalClient;
        this.pdfService = pdfService;
    }

    @Transactional
    public TrainingCertificateResponse issueForCurrentLearner(
            Long trainingId
    ) {
        requireLearner();

        if (trainingId == null || trainingId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant formation invalide."
            );
        }

        Long learnerId =
                authenticatedUserService.getUserId();

        TrainingCertificate existing =
                certificateRepository
                        .findByLearnerIdAndTrainingId(
                                learnerId,
                                trainingId
                        )
                        .orElse(null);

        if (existing != null) {
            return new TrainingCertificateResponse(
                    existing
            );
        }

        Enrollment enrollment =
                enrollmentRepository
                        .findByLearnerIdAndTrainingId(
                                learnerId,
                                trainingId
                        )
                        .orElseThrow(
                            () -> new AccessDeniedException(
                                "L'apprenant n'est pas inscrit a cette formation."
                            )
                        );

        assertCompleted(enrollment);

        Training training = enrollment.getTraining();

        InternalLearnerIdentityResponse identity =
                authInternalClient
                        .getLearnerIdentity(
                                learnerId
                        );

        TrainingCertificate certificate =
                new TrainingCertificate();

        certificate.setPublicCode(
                nextPublicCode()
        );
        certificate.setLearnerId(learnerId);
        certificate.setTrainingId(trainingId);
        certificate.setEnrollmentId(
                enrollment.getId()
        );

        // Enrollment n'est pas epingle a une TrainingVersion dans le modele actuel.
        // On ne fabrique donc pas une version suivie qui n'est pas prouvable.
        certificate.setTrainingVersionNumber(null);

        certificate.setLearnerDisplayNameSnapshot(
                identity.getFullName().trim()
        );
        certificate.setTrainingTitleSnapshot(
                training.getTitle()
        );
        certificate.setIssuedAt(
                LocalDateTime.now()
        );
        certificate.setStatus(
                CertificateStatus.ACTIVE
        );

        TrainingCertificate saved =
                certificateRepository.save(
                        certificate
                );

        return new TrainingCertificateResponse(
                saved
        );
    }

    @Transactional(readOnly = true)
    public List<TrainingCertificateResponse> getMine() {
        requireLearner();

        Long learnerId =
                authenticatedUserService.getUserId();

        return certificateRepository
                .findByLearnerIdOrderByIssuedAtDesc(
                        learnerId
                )
                .stream()
                .map(TrainingCertificateResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public TrainingCertificateResponse getMineById(
            Long certificateId
    ) {
        TrainingCertificate certificate =
                requireMine(certificateId);

        return new TrainingCertificateResponse(
                certificate
        );
    }

    @Transactional(readOnly = true)
    public byte[] getMinePdf(
            Long certificateId
    ) {
        TrainingCertificate certificate =
                requireMine(certificateId);

        if (certificate.getStatus()
                != CertificateStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Ce certificat n'est plus actif."
            );
        }

        return pdfService.generate(certificate);
    }

    @Transactional(readOnly = true)
    public CertificateVerificationResponse verify(
            String publicCode
    ) {
        if (publicCode == null
                || publicCode.isBlank()
                || publicCode.length() > 64) {
            return CertificateVerificationResponse
                    .invalid(publicCode);
        }

        return certificateRepository
                .findByPublicCode(
                        publicCode.trim()
                )
                .map(
                    CertificateVerificationResponse::from
                )
                .orElseGet(
                    () -> CertificateVerificationResponse
                            .invalid(
                                publicCode.trim()
                            )
                );
    }

    private TrainingCertificate requireMine(
            Long certificateId
    ) {
        requireLearner();

        if (certificateId == null
                || certificateId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant certificat invalide."
            );
        }

        Long learnerId =
                authenticatedUserService.getUserId();

        return certificateRepository
                .findByIdAndLearnerId(
                        certificateId,
                        learnerId
                )
                .orElseThrow(
                    () -> new AccessDeniedException(
                        "Certificat introuvable pour cet apprenant."
                    )
                );
    }

    private void assertCompleted(
            Enrollment enrollment
    ) {
        if (enrollment.getStatus()
                != EnrollmentStatus.COMPLETED) {
            throw new IllegalArgumentException(
                    "La formation doit etre terminee avant l'emission du certificat."
            );
        }

        Double progress =
                enrollment.getProgressPercentage();

        if (progress == null
                || progress < 100.0d) {
            throw new IllegalArgumentException(
                    "La progression serveur n'est pas complete."
            );
        }

        if (enrollment.getCompletedAt() == null) {
            throw new IllegalArgumentException(
                    "La date de completion serveur est absente."
            );
        }
    }

    private String nextPublicCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            byte[] randomBytes = new byte[24];
            RANDOM.nextBytes(randomBytes);

            String code =
                    "STC-"
                    + HexFormat
                        .of()
                        .withUpperCase()
                        .formatHex(randomBytes);

            if (!certificateRepository
                    .existsByPublicCode(code)) {
                return code;
            }
        }

        throw new IllegalStateException(
                "Impossible de generer un code public unique."
        );
    }

    private void requireLearner() {
        String role = authenticatedUserService.getRole();

        if (!"APPRENANT".equals(role)
                && !"FORMATEUR".equals(role)
                && !"ADMIN".equals(role)) {
            throw new AccessDeniedException(
                    "Cette action necessite une identite utilisateur pouvant suivre une formation."
            );
        }
    }
}