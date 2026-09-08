package com.smarttraining.training.controller;

import com.smarttraining.training.dto.CertificateVerificationResponse;
import com.smarttraining.training.dto.TrainingCertificateResponse;
import com.smarttraining.training.service.TrainingCertificateService;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/certificates")
public class TrainingCertificateController {

    private final TrainingCertificateService service;

    public TrainingCertificateController(
            TrainingCertificateService service
    ) {
        this.service = service;
    }

    @PostMapping(
        "/me/trainings/{trainingId}/issue"
    )
    public TrainingCertificateResponse issue(
            @PathVariable Long trainingId
    ) {
        return service.issueForCurrentLearner(
                trainingId
        );
    }

    @GetMapping("/me")
    public List<TrainingCertificateResponse> getMine() {
        return service.getMine();
    }

    @GetMapping("/me/{certificateId}")
    public TrainingCertificateResponse getMineById(
            @PathVariable Long certificateId
    ) {
        return service.getMineById(
                certificateId
        );
    }

    @GetMapping(
        value = "/me/{certificateId}/pdf",
        produces = MediaType.APPLICATION_PDF_VALUE
    )
    public ResponseEntity<byte[]> getMinePdf(
            @PathVariable Long certificateId
    ) {
        TrainingCertificateResponse certificate =
                service.getMineById(certificateId);

        byte[] pdf =
                service.getMinePdf(certificateId);

        String fileName =
                "certificat-smarttraining-"
                + certificate.getPublicCode()
                + ".pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(
                    HttpHeaders.CONTENT_DISPOSITION,
                    ContentDisposition
                        .attachment()
                        .filename(fileName)
                        .build()
                        .toString()
                )
                .body(pdf);
    }

    @GetMapping("/verify/{publicCode}")
    public CertificateVerificationResponse verify(
            @PathVariable String publicCode
    ) {
        return service.verify(publicCode);
    }
}