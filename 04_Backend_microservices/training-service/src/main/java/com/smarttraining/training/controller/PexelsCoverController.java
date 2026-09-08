package com.smarttraining.training.controller;

import com.smarttraining.training.dto.FileUploadResponse;
import com.smarttraining.training.dto.PexelsSearchResponse;
import com.smarttraining.training.service.PexelsCoverService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/trainings/cover-library/pexels")
public class PexelsCoverController {

    private final PexelsCoverService pexelsCoverService;

    public PexelsCoverController(
            PexelsCoverService pexelsCoverService
    ) {
        this.pexelsCoverService =
                pexelsCoverService;
    }

    @GetMapping("/search")
    public ResponseEntity<PexelsSearchResponse> search(
            @RequestParam String query,
            @RequestParam(required = false)
            Integer page,
            @RequestParam(required = false)
            Integer perPage
    ) {
        return ResponseEntity.ok(
                pexelsCoverService.search(
                        query,
                        page,
                        perPage
                )
        );
    }

    @PostMapping("/{photoId}/import")
    public ResponseEntity<FileUploadResponse>
            importTrainingCover(
                    @PathVariable Long photoId,
                    @RequestParam Long trainingId
            ) {
        return ResponseEntity.ok(
                pexelsCoverService
                        .importTrainingCover(
                                trainingId,
                                photoId
                        )
        );
    }
}