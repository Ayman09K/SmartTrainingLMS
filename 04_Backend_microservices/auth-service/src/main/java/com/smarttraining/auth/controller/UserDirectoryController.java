package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.LearnerDirectoryResolveRequest;
import com.smarttraining.auth.dto.UserResponse;
import com.smarttraining.auth.service.UserDirectoryService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/directory/learners")
public class UserDirectoryController {

    private final UserDirectoryService userDirectoryService;

    public UserDirectoryController(UserDirectoryService userDirectoryService) {
        this.userDirectoryService = userDirectoryService;
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> searchLearners(
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(required = false, defaultValue = "30") Integer limit
    ) {
        return ResponseEntity.ok(userDirectoryService.searchActiveLearners(query, limit));
    }

    @GetMapping("/{learnerId}")
    public ResponseEntity<UserResponse> getLearner(@PathVariable Long learnerId) {
        return ResponseEntity.ok(userDirectoryService.getLearner(learnerId));
    }

    @PostMapping("/resolve")
    public ResponseEntity<List<UserResponse>> resolveLearners(
            @Valid @RequestBody LearnerDirectoryResolveRequest request
    ) {
        return ResponseEntity.ok(userDirectoryService.resolveLearners(request.getLearnerIds()));
    }
}
