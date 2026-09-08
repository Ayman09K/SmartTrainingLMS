package com.smarttraining.training.controller;

import com.smarttraining.training.service.TrainingCsvExportService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/enrollments/exports")
public class TrainingCsvExportController {

    private static final MediaType CSV =
            MediaType.parseMediaType(
                    "text/csv;charset=UTF-8"
            );

    private final TrainingCsvExportService exportService;

    public TrainingCsvExportController(
            TrainingCsvExportService exportService
    ) {
        this.exportService = exportService;
    }

    @GetMapping(
        value = "/trainings/{trainingId}/learners.csv",
        produces = "text/csv;charset=UTF-8"
    )
    public ResponseEntity<byte[]> exportTrainingLearners(
            @PathVariable Long trainingId
    ) {
        byte[] csv =
                exportService
                        .exportTrainingLearners(
                                trainingId
                        );

        String fileName =
                "smarttraining-formation-"
                + trainingId
                + "-participants.csv";

        return ResponseEntity.ok()
                .contentType(CSV)
                .header(
                    HttpHeaders.CONTENT_DISPOSITION,
                    ContentDisposition
                        .attachment()
                        .filename(fileName)
                        .build()
                        .toString()
                )
                .body(csv);
    }

    @GetMapping(
        value = "/learning-paths/{pathId}/learners.csv",
        produces = "text/csv;charset=UTF-8"
    )
    public ResponseEntity<byte[]> exportLearningPathLearners(
            @PathVariable Long pathId
    ) {
        byte[] csv =
                exportService
                        .exportLearningPathLearners(
                                pathId
                        );

        String fileName =
                "smarttraining-parcours-"
                + pathId
                + "-participants.csv";

        return ResponseEntity.ok()
                .contentType(CSV)
                .header(
                    HttpHeaders.CONTENT_DISPOSITION,
                    ContentDisposition
                        .attachment()
                        .filename(fileName)
                        .build()
                        .toString()
                )
                .body(csv);
    }

    @GetMapping(
        value = "/learning-paths/{pathId}/learners-detail.csv",
        produces = "text/csv;charset=UTF-8"
    )
    public ResponseEntity<byte[]> exportLearningPathLearnersDetail(
            @PathVariable Long pathId
    ) {
        byte[] csv =
                exportService
                        .exportLearningPathLearnersDetail(
                                pathId
                        );

        String fileName =
                "smarttraining-parcours-"
                + pathId
                + "-participants-detail.csv";

        return ResponseEntity.ok()
                .contentType(CSV)
                .header(
                    HttpHeaders.CONTENT_DISPOSITION,
                    ContentDisposition
                        .attachment()
                        .filename(fileName)
                        .build()
                        .toString()
                )
                .body(csv);
    }
}