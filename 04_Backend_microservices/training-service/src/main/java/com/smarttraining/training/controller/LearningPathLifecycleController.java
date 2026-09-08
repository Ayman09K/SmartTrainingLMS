package com.smarttraining.training.controller;

import com.smarttraining.training.dto.LearningPathResponse;
import com.smarttraining.training.service.LearningPathLifecycleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trainings/learning-paths/{pathId}")
public class LearningPathLifecycleController {

    private final LearningPathLifecycleService lifecycleService;

    public LearningPathLifecycleController(
            LearningPathLifecycleService lifecycleService
    ) {
        this.lifecycleService = lifecycleService;
    }

    @PutMapping("/publish")
    public ResponseEntity<LearningPathResponse> publishPath(
            @PathVariable Long pathId
    ) {
        return ResponseEntity.ok(
                lifecycleService.publishPath(pathId)
        );
    }

    @PutMapping("/archive")
    public ResponseEntity<LearningPathResponse> archivePath(
            @PathVariable Long pathId
    ) {
        return ResponseEntity.ok(
                lifecycleService.archivePath(pathId)
        );
    }

    @PutMapping("/unarchive")
    public ResponseEntity<LearningPathResponse> unarchivePath(
            @PathVariable Long pathId
    ) {
        return ResponseEntity.ok(
                lifecycleService.unarchivePath(pathId)
        );
    }

}