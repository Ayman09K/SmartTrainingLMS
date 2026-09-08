package com.smarttraining.training.controller;

import com.smarttraining.training.dto.TrainingAccessRequestCreateRequest;
import com.smarttraining.training.dto.TrainingAccessRequestDecisionRequest;
import com.smarttraining.training.dto.TrainingAccessRequestResponse;
import com.smarttraining.training.service.EnrollmentAccessService;
import com.smarttraining.training.service.TrainingNotificationProducer;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/training-access-requests")
public class TrainingAccessRequestController {

    private final EnrollmentAccessService enrollmentAccessService;
    private final TrainingNotificationProducer notificationProducer;

    public TrainingAccessRequestController(
            EnrollmentAccessService enrollmentAccessService,
            TrainingNotificationProducer notificationProducer
    ) {
        this.enrollmentAccessService = enrollmentAccessService;
        this.notificationProducer = notificationProducer;
    }
    @PostMapping
    public ResponseEntity<TrainingAccessRequestResponse> createAccessRequest(
            @Valid @RequestBody TrainingAccessRequestCreateRequest request
    ) {
        return ResponseEntity.ok(enrollmentAccessService.createAccessRequest(request));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<TrainingAccessRequestResponse>> getPendingAccessRequests() {
        return ResponseEntity.ok(enrollmentAccessService.getPendingAccessRequests());
    }

    @GetMapping("/learner/{learnerId}")
    public ResponseEntity<List<TrainingAccessRequestResponse>> getAccessRequestsByLearner(
            @PathVariable Long learnerId
    ) {
        return ResponseEntity.ok(enrollmentAccessService.getAccessRequestsByLearner(learnerId));
    }

    @GetMapping("/training/{trainingId}")
    public ResponseEntity<List<TrainingAccessRequestResponse>> getAccessRequestsByTraining(
            @PathVariable Long trainingId
    ) {
        return ResponseEntity.ok(enrollmentAccessService.getAccessRequestsByTraining(trainingId));
    }

    @PutMapping("/{requestId}/approve")
    public ResponseEntity<TrainingAccessRequestResponse> approveAccessRequest(
            @PathVariable Long requestId,
            @Valid @RequestBody TrainingAccessRequestDecisionRequest decision
    ) {
        TrainingAccessRequestResponse response =
            enrollmentAccessService.approveAccessRequest(
                requestId,
                decision
            );

        notificationProducer.notifyAccessDecision(response);

        return ResponseEntity.ok(response);
    }
    @PutMapping("/{requestId}/reject")
    public ResponseEntity<TrainingAccessRequestResponse> rejectAccessRequest(
            @PathVariable Long requestId,
            @Valid @RequestBody TrainingAccessRequestDecisionRequest decision
    ) {
        TrainingAccessRequestResponse response =
            enrollmentAccessService.rejectAccessRequest(
                requestId,
                decision
            );

        notificationProducer.notifyAccessDecision(response);

        return ResponseEntity.ok(response);
    }
}
