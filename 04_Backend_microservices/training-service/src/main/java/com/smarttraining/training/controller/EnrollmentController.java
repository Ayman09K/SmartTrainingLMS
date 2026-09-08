package com.smarttraining.training.controller;

import com.smarttraining.training.dto.AccessCodeEnrollmentRequest;
import com.smarttraining.training.dto.EnrollmentRequest;
import com.smarttraining.training.dto.EnrollmentResponse;
import com.smarttraining.training.dto.SelfEnrollmentRequest;
import com.smarttraining.training.dto.TrainingAssignmentRequest;
import com.smarttraining.training.service.EnrollmentAccessService;
import com.smarttraining.training.service.TrainingService;
import com.smarttraining.training.service.TrainingNotificationProducer;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/enrollments")
public class EnrollmentController {

    private final TrainingService trainingService;
    private final EnrollmentAccessService enrollmentAccessService;
    private final TrainingNotificationProducer notificationProducer;

    public EnrollmentController(
            TrainingService trainingService,
            EnrollmentAccessService enrollmentAccessService,
            TrainingNotificationProducer notificationProducer
    ) {
        this.trainingService = trainingService;
        this.enrollmentAccessService = enrollmentAccessService;
        this.notificationProducer = notificationProducer;
    }
    // Endpoint historique conservé.
    // Il sert encore à affecter un seul apprenant depuis admin/formateur.
    @PostMapping
    public ResponseEntity<EnrollmentResponse> enrollLearner(@Valid @RequestBody EnrollmentRequest request) {
        EnrollmentResponse enrollment =
                trainingService.enrollLearner(request);

        notificationProducer.notifyAssignment(enrollment);
        notificationProducer.notifyDeadlineAssigned(enrollment);

        return ResponseEntity.ok(enrollment);
    }

    @PostMapping("/self")
    public ResponseEntity<EnrollmentResponse> selfEnroll(@Valid @RequestBody SelfEnrollmentRequest request) {
        return ResponseEntity.ok(enrollmentAccessService.selfEnroll(request));
    }

    @DeleteMapping("/self/{trainingId}")
    public ResponseEntity<EnrollmentResponse> selfUnenroll(@PathVariable Long trainingId) {
        return ResponseEntity.ok(enrollmentAccessService.selfUnenroll(trainingId));
    }

    @PostMapping("/access-code")
    public ResponseEntity<EnrollmentResponse> enrollWithAccessCode(
            @Valid @RequestBody AccessCodeEnrollmentRequest request
    ) {
        return ResponseEntity.ok(enrollmentAccessService.enrollWithAccessCode(request));
    }

    @PostMapping("/assignments")
    public ResponseEntity<List<EnrollmentResponse>> assignLearners(
            @Valid @RequestBody TrainingAssignmentRequest request
    ) {
        List<EnrollmentResponse> assignments =
            enrollmentAccessService.assignLearners(request);

        assignments.forEach(enrollment -> {
            notificationProducer.notifyAssignment(enrollment);
            notificationProducer.notifyDeadlineAssigned(enrollment);
        });

        return ResponseEntity.ok(assignments);
    }
    @GetMapping("/learner/{learnerId}")
    public ResponseEntity<List<EnrollmentResponse>> getEnrollmentsByLearner(@PathVariable Long learnerId) {
        return ResponseEntity.ok(trainingService.getEnrollmentsByLearner(learnerId));
    }

    @GetMapping("/training/{trainingId}")
    public ResponseEntity<List<EnrollmentResponse>> getEnrollmentsByTraining(@PathVariable Long trainingId) {
        return ResponseEntity.ok(trainingService.getEnrollmentsByTraining(trainingId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEnrollment(@PathVariable Long id) {
        trainingService.deleteEnrollment(id);
        return ResponseEntity.noContent().build();
    }
}
