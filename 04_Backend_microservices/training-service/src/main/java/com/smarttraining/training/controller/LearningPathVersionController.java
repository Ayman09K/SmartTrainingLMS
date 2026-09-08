package com.smarttraining.training.controller;

import com.smarttraining.training.dto.LearningPathResponse;
import com.smarttraining.training.service.LearningPathVersionService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trainings/learning-paths/{pathId}/versions")
public class LearningPathVersionController {

    private final LearningPathVersionService versionService;

    public LearningPathVersionController(
            LearningPathVersionService versionService
    ) {
        this.versionService = versionService;
    }

    @GetMapping
    public ResponseEntity<List<LearningPathResponse>> listVersions(
            @PathVariable Long pathId
    ) {
        return ResponseEntity.ok(
                versionService.listVersions(pathId)
        );
    }

    @PostMapping
    public ResponseEntity<LearningPathResponse> createDraftVersion(
            @PathVariable Long pathId
    ) {
        return ResponseEntity.ok(
                versionService.createDraftVersion(pathId)
        );
    }
}
