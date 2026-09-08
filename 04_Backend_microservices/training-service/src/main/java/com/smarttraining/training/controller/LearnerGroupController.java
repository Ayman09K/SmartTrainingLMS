package com.smarttraining.training.controller;

import com.smarttraining.training.dto.LearnerGroupMemberAddRequest;
import com.smarttraining.training.dto.LearnerGroupMemberResponse;
import com.smarttraining.training.dto.LearnerGroupRequest;
import com.smarttraining.training.dto.LearnerGroupResponse;
import com.smarttraining.training.dto.LearnerGroupTrainingAssignmentRequest;
import com.smarttraining.training.dto.LearnerGroupTrainingAssignmentResponse;
import com.smarttraining.training.dto.LearnerGroupTrainingAssignmentRecordResponse;
import com.smarttraining.training.service.LearnerGroupService;
import com.smarttraining.training.service.TrainingNotificationProducer;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/trainings/learner-groups")
public class LearnerGroupController {

    private final LearnerGroupService learnerGroupService;
    private final TrainingNotificationProducer notificationProducer;

    public LearnerGroupController(
            LearnerGroupService learnerGroupService,
            TrainingNotificationProducer notificationProducer
    ) {
        this.learnerGroupService = learnerGroupService;
        this.notificationProducer = notificationProducer;
    }

    @GetMapping
    public ResponseEntity<List<LearnerGroupResponse>> getGroups() {
        return ResponseEntity.ok(
                learnerGroupService.getGroups()
        );
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<LearnerGroupResponse> getGroup(
            @PathVariable Long groupId
    ) {
        return ResponseEntity.ok(
                learnerGroupService.getGroup(groupId)
        );
    }

    @PostMapping
    public ResponseEntity<LearnerGroupResponse> createGroup(
            @Valid @RequestBody LearnerGroupRequest request
    ) {
        return ResponseEntity.ok(
                learnerGroupService.createGroup(request)
        );
    }

    @PutMapping("/{groupId}")
    public ResponseEntity<LearnerGroupResponse> updateGroup(
            @PathVariable Long groupId,
            @Valid @RequestBody LearnerGroupRequest request
    ) {
        return ResponseEntity.ok(
                learnerGroupService.updateGroup(
                    groupId,
                    request
                )
        );
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> deleteGroup(
            @PathVariable Long groupId
    ) {
        learnerGroupService.deleteGroup(groupId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<List<LearnerGroupMemberResponse>> getMembers(
            @PathVariable Long groupId
    ) {
        return ResponseEntity.ok(
                learnerGroupService.getMembers(groupId)
        );
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<List<LearnerGroupMemberResponse>> addMembers(
            @PathVariable Long groupId,
            @Valid @RequestBody LearnerGroupMemberAddRequest request
    ) {
        return ResponseEntity.ok(
                learnerGroupService.addMembers(
                    groupId,
                    request
                )
        );
    }

    @DeleteMapping("/{groupId}/members/{learnerId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long groupId,
            @PathVariable Long learnerId
    ) {
        learnerGroupService.removeMember(
                groupId,
                learnerId
        );
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{groupId}/training-assignments")
    public ResponseEntity<List<LearnerGroupTrainingAssignmentRecordResponse>>
            getTrainingAssignments(
                @PathVariable Long groupId
            ) {
        return ResponseEntity.ok(
                learnerGroupService.getTrainingAssignments(groupId)
        );
    }

    @PostMapping("/{groupId}/training-assignments")
    public ResponseEntity<LearnerGroupTrainingAssignmentResponse>
            assignTrainingToGroup(
                @PathVariable Long groupId,
                @Valid @RequestBody
                    LearnerGroupTrainingAssignmentRequest request
            ) {
        LearnerGroupTrainingAssignmentResponse result =
                learnerGroupService.assignTrainingToGroup(
                    groupId,
                    request
                );

        result.getAssignedEnrollments()
                .forEach(enrollment -> {
                    notificationProducer.notifyAssignment(
                        enrollment
                    );
                    notificationProducer.notifyDeadlineAssigned(
                        enrollment
                    );
                });

        return ResponseEntity.ok(result);
    }
}
