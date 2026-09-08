package com.smarttraining.training.controller;

import com.smarttraining.training.dto.LearningPathRequest;
import com.smarttraining.training.dto.LearningPathResponse;
import com.smarttraining.training.service.LearningPathService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trainings/learning-paths")
public class LearningPathController {

    private final LearningPathService pathService;

    public LearningPathController(LearningPathService pathService) {
        this.pathService = pathService;
    }

    @PostMapping
    public ResponseEntity<LearningPathResponse> createPath(
            @Valid @RequestBody LearningPathRequest request
    ) {
        return ResponseEntity.ok(pathService.createPath(request));
    }

    @GetMapping
    public ResponseEntity<List<LearningPathResponse>> getManageablePaths() {
        return ResponseEntity.ok(pathService.getManageablePaths());
    }

    @GetMapping("/{pathId}")
    public ResponseEntity<LearningPathResponse> getPath(
            @PathVariable Long pathId
    ) {
        return ResponseEntity.ok(pathService.getPath(pathId));
    }

    @PutMapping("/{pathId}")
    public ResponseEntity<LearningPathResponse> updatePath(
            @PathVariable Long pathId,
            @Valid @RequestBody LearningPathRequest request
    ) {
        return ResponseEntity.ok(
                pathService.updatePath(pathId, request)
        );
    }

    @DeleteMapping("/{pathId}")
    public ResponseEntity<Void> deletePath(
            @PathVariable Long pathId
    ) {
        pathService.deletePath(pathId);
        return ResponseEntity.noContent().build();
    }
}