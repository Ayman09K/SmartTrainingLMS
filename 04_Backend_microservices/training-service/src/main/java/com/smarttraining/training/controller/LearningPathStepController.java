package com.smarttraining.training.controller;

import com.smarttraining.training.dto.LearningPathStepAddRequest;
import com.smarttraining.training.dto.LearningPathStepReorderRequest;
import com.smarttraining.training.dto.LearningPathStepRequiredRequest;
import com.smarttraining.training.dto.LearningPathStepResponse;
import com.smarttraining.training.service.LearningPathStepService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trainings/learning-paths/{pathId}/steps")
public class LearningPathStepController {

    private final LearningPathStepService stepService;

    public LearningPathStepController(
            LearningPathStepService stepService
    ) {
        this.stepService = stepService;
    }

    @GetMapping
    public ResponseEntity<List<LearningPathStepResponse>> getSteps(
            @PathVariable Long pathId
    ) {
        return ResponseEntity.ok(stepService.getSteps(pathId));
    }

    @PostMapping
    public ResponseEntity<LearningPathStepResponse> addStep(
            @PathVariable Long pathId,
            @Valid @RequestBody LearningPathStepAddRequest request
    ) {
        return ResponseEntity.ok(
                stepService.addStep(pathId, request)
        );
    }

    @PatchMapping("/{stepId}")
    public ResponseEntity<LearningPathStepResponse> updateRequired(
            @PathVariable Long pathId,
            @PathVariable Long stepId,
            @Valid @RequestBody LearningPathStepRequiredRequest request
    ) {
        return ResponseEntity.ok(
                stepService.updateRequired(pathId, stepId, request)
        );
    }

    @PutMapping("/reorder")
    public ResponseEntity<List<LearningPathStepResponse>> reorderSteps(
            @PathVariable Long pathId,
            @Valid @RequestBody LearningPathStepReorderRequest request
    ) {
        return ResponseEntity.ok(
                stepService.reorderSteps(pathId, request)
        );
    }

    @DeleteMapping("/{stepId}")
    public ResponseEntity<Void> removeStep(
            @PathVariable Long pathId,
            @PathVariable Long stepId
    ) {
        stepService.removeStep(pathId, stepId);
        return ResponseEntity.noContent().build();
    }
}