package com.smarttraining.training.controller;

import com.smarttraining.training.dto.LearningPathProgressResponse;
import com.smarttraining.training.service.LearningPathProgressService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class LearningPathProgressController {

    private final LearningPathProgressService progressService;

    public LearningPathProgressController(
            LearningPathProgressService progressService
    ) {
        this.progressService = progressService;
    }

    @GetMapping("/trainings/learning-paths/learner/me")
    public ResponseEntity<List<LearningPathProgressResponse>>
            getMyAssignedPaths() {
        return ResponseEntity.ok(
                progressService.getMyAssignedPaths()
        );
    }

    @GetMapping(
            "/trainings/learning-paths/{pathId}/progress/me"
    )
    public ResponseEntity<LearningPathProgressResponse>
            getMyPathProgress(
                    @PathVariable Long pathId
            ) {
        return ResponseEntity.ok(
                progressService.getMyPathProgress(pathId)
        );
    }

    @GetMapping(
            "/trainings/learning-paths/{pathId}/progress/learners"
    )
    public ResponseEntity<List<LearningPathProgressResponse>>
            getManagedLearnerProgress(
                    @PathVariable Long pathId
            ) {
        return ResponseEntity.ok(
                progressService.getManagedLearnerProgress(pathId)
        );
    }

    @GetMapping(
            "/trainings/learning-paths/{pathId}/progress/learners/{learnerId}"
    )
    public ResponseEntity<LearningPathProgressResponse>
            getManagedLearnerProgress(
                    @PathVariable Long pathId,
                    @PathVariable Long learnerId
            ) {
        return ResponseEntity.ok(
                progressService.getManagedLearnerProgress(
                        pathId,
                        learnerId
                )
        );
    }
}