package com.smarttraining.training.controller;

import com.smarttraining.training.dto.LearningPathAssignmentRecordResponse;
import com.smarttraining.training.dto.LearningPathAssignmentResult;
import com.smarttraining.training.dto.LearningPathGroupAssignmentRecordResponse;
import com.smarttraining.training.dto.LearningPathGroupAssignmentRequest;
import com.smarttraining.training.dto.LearningPathLearnerAssignmentRequest;
import com.smarttraining.training.service.LearningPathAssignmentService;
import com.smarttraining.training.service.TrainingNotificationProducer;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trainings/learning-paths/{pathId}/assignments")
public class LearningPathAssignmentController {

    private final LearningPathAssignmentService assignmentService;
    private final TrainingNotificationProducer notificationProducer;

    public LearningPathAssignmentController(
            LearningPathAssignmentService assignmentService,
            TrainingNotificationProducer notificationProducer
    ) {
        this.assignmentService = assignmentService;
        this.notificationProducer = notificationProducer;
    }

    @PostMapping("/learners")
    public ResponseEntity<LearningPathAssignmentResult> assignLearners(
            @PathVariable Long pathId,
            @Valid @RequestBody LearningPathLearnerAssignmentRequest request
    ) {
        LearningPathAssignmentResult result =
                assignmentService.assignLearners(pathId, request);

        notifyAssignments(result);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/groups/{groupId}")
    public ResponseEntity<LearningPathAssignmentResult> assignGroup(
            @PathVariable Long pathId,
            @PathVariable Long groupId,
            @Valid @RequestBody LearningPathGroupAssignmentRequest request
    ) {
        LearningPathAssignmentResult result =
                assignmentService.assignGroup(
                        pathId,
                        groupId,
                        request
                );

        notifyAssignments(result);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/learners")
    public ResponseEntity<List<LearningPathAssignmentRecordResponse>>
            getLearnerAssignments(
                    @PathVariable Long pathId
            ) {
        return ResponseEntity.ok(
                assignmentService.getLearnerAssignments(pathId)
        );
    }

    @GetMapping("/groups")
    public ResponseEntity<List<LearningPathGroupAssignmentRecordResponse>>
            getGroupAssignments(
                    @PathVariable Long pathId
            ) {
        return ResponseEntity.ok(
                assignmentService.getGroupAssignments(pathId)
        );
    }

    private void notifyAssignments(
            LearningPathAssignmentResult result
    ) {
        result.getAssignedEnrollments()
                .forEach(enrollment -> {
                    notificationProducer.notifyAssignment(enrollment);
                    notificationProducer.notifyDeadlineAssigned(enrollment);
                });
    }
}