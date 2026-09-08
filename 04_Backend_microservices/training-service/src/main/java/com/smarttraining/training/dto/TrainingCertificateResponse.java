package com.smarttraining.training.dto;

import com.smarttraining.training.entity.TrainingCertificate;
import com.smarttraining.training.enums.CertificateStatus;
import java.time.LocalDateTime;

public class TrainingCertificateResponse {

    private final Long id;
    private final String publicCode;
    private final Long trainingId;
    private final Integer trainingVersionNumber;
    private final String learnerDisplayName;
    private final String trainingTitle;
    private final LocalDateTime issuedAt;
    private final CertificateStatus status;

    public TrainingCertificateResponse(
            TrainingCertificate certificate
    ) {
        this.id = certificate.getId();
        this.publicCode = certificate.getPublicCode();
        this.trainingId = certificate.getTrainingId();
        this.trainingVersionNumber =
                certificate.getTrainingVersionNumber();
        this.learnerDisplayName =
                certificate.getLearnerDisplayNameSnapshot();
        this.trainingTitle =
                certificate.getTrainingTitleSnapshot();
        this.issuedAt = certificate.getIssuedAt();
        this.status = certificate.getStatus();
    }

    public Long getId() {
        return id;
    }

    public String getPublicCode() {
        return publicCode;
    }

    public Long getTrainingId() {
        return trainingId;
    }

    public Integer getTrainingVersionNumber() {
        return trainingVersionNumber;
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

    public CertificateStatus getStatus() {
        return status;
    }
}