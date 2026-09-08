package com.smarttraining.training.controller;

import com.smarttraining.training.dto.LearningCompletionResponse;
import com.smarttraining.training.service.LearningCompletionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LearningCompletionController {

    private final LearningCompletionService completionService;

    public LearningCompletionController(LearningCompletionService completionService) {
        this.completionService = completionService;
    }

    @PostMapping("/lessons/{lessonId}/complete")
    public ResponseEntity<LearningCompletionResponse> completeLesson(
            @PathVariable Long lessonId
    ) {
        return ResponseEntity.ok(completionService.completeLesson(lessonId));
    }

    @PostMapping("/resources/{resourceId}/complete")
    public ResponseEntity<LearningCompletionResponse> completeResource(
            @PathVariable Long resourceId
    ) {
        return ResponseEntity.ok(completionService.completeResource(resourceId));
    }
}