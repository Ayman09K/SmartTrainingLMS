package com.smarttraining.training.dto;

import com.smarttraining.training.entity.TrainingCertificate;
import java.time.LocalDateTime;

public class CertificateVerificationResponse {

    private final boolean valid;
    private final String publicCode;
    private final String learnerDisplayName;
    private final String trainingTitle;
    private final LocalDateTime issuedAt;
    private final String status;

    private CertificateVerificationResponse(
            boolean valid,
            String publicCode,
            String learnerDisplayName,
            String trainingTitle,
            LocalDateTime issuedAt,
            String status
    ) {
        this.valid = valid;
        this.publicCode = publicCode;
        this.learnerDisplayName = learnerDisplayName;
        this.trainingTitle = trainingTitle;
        this.issuedAt = issuedAt;
        this.status = status;
    }

    public static CertificateVerificationResponse from(
            TrainingCertificate certificate
    ) {
        boolean valid =
                certificate.getStatus() != null
                && "ACTIVE".equals(certificate.getStatus().name());

        return new CertificateVerificationResponse(
                valid,
                certificate.getPublicCode(),
                certificate.getLearnerDisplayNameSnapshot(),
                certificate.getTrainingTitleSnapshot(),
                certificate.getIssuedAt(),
                certificate.getStatus() == null
                        ? "UNKNOWN"
                        : certificate.getStatus().name()
        );
    }

    public static CertificateVerificationResponse invalid(
            String publicCode
    ) {
        return new CertificateVerificationResponse(
                false,
                publicCode,
                null,
                null,
                null,
                "INVALID"
        );
    }

    public boolean isValid() {
        return valid;
    }

    public String getPublicCode() {
        return publicCode;
    }

    public String getLearnerDisplayName() {
        return learnerDisplayName;
    }

    public String getTrainingTitle() {
        return trainingTitle;
    }

    public LocalDateTime getIssuedAt() {
        return issuedAt;
    }

    public String getStatus() {
        return status;
    }
}