package com.smarttraining.training.controller;

import com.smarttraining.training.dto.TrainingInvitationAcceptRequest;
import com.smarttraining.training.dto.TrainingInvitationCreateRequest;
import com.smarttraining.training.dto.TrainingInvitationResponse;
import com.smarttraining.training.service.EnrollmentAccessService;
import com.smarttraining.training.service.TrainingNotificationProducer;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/training-invitations")
public class TrainingInvitationController {

    private final EnrollmentAccessService enrollmentAccessService;
    private final TrainingNotificationProducer notificationProducer;

    public TrainingInvitationController(
            EnrollmentAccessService enrollmentAccessService,
            TrainingNotificationProducer notificationProducer
    ) {
        this.enrollmentAccessService = enrollmentAccessService;
        this.notificationProducer = notificationProducer;
    }
    @PostMapping
    public ResponseEntity<TrainingInvitationResponse> createInvitation(
            @Valid @RequestBody TrainingInvitationCreateRequest request
    ) {
        TrainingInvitationResponse invitation =
            enrollmentAccessService.createInvitation(request);

        notificationProducer.notifyInvitation(invitation);

        return ResponseEntity.ok(invitation);
    }
    @GetMapping("/pending")
    public ResponseEntity<List<TrainingInvitationResponse>> getPendingInvitations() {
        return ResponseEntity.ok(enrollmentAccessService.getPendingInvitations());
    }

    @GetMapping("/training/{trainingId}")
    public ResponseEntity<List<TrainingInvitationResponse>> getInvitationsByTraining(
            @PathVariable Long trainingId
    ) {
        return ResponseEntity.ok(enrollmentAccessService.getInvitationsByTraining(trainingId));
    }

    @GetMapping("/learner/{learnerId}")
    public ResponseEntity<List<TrainingInvitationResponse>> getInvitationsByLearner(
            @PathVariable Long learnerId
    ) {
        return ResponseEntity.ok(enrollmentAccessService.getInvitationsByLearner(learnerId));
    }

    @GetMapping("/learner-email")
    public ResponseEntity<List<TrainingInvitationResponse>> getInvitationsByLearnerEmail(
            @RequestParam String email
    ) {
        return ResponseEntity.ok(enrollmentAccessService.getInvitationsByLearnerEmail(email));
    }

    @PostMapping("/accept")
    public ResponseEntity<TrainingInvitationResponse> acceptInvitation(
            @Valid @RequestBody TrainingInvitationAcceptRequest request
    ) {
        return ResponseEntity.ok(enrollmentAccessService.acceptInvitation(request));
    }

    @PutMapping("/{invitationId}/decline")
    public ResponseEntity<TrainingInvitationResponse> declineInvitation(@PathVariable Long invitationId) {
        return ResponseEntity.ok(enrollmentAccessService.declineInvitation(invitationId));
    }

    @PutMapping("/{invitationId}/cancel")
    public ResponseEntity<TrainingInvitationResponse> cancelInvitation(@PathVariable Long invitationId) {
        return ResponseEntity.ok(enrollmentAccessService.cancelInvitation(invitationId));
    }
}
