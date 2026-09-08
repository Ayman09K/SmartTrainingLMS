package com.smarttraining.training.controller;

import com.smarttraining.training.dto.ResourceRequest;
import com.smarttraining.training.dto.ResourceResponse;
import com.smarttraining.training.service.TrainingService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/resources")
public class ResourceController {

    private final TrainingService trainingService;

    public ResourceController(TrainingService trainingService) {
        this.trainingService = trainingService;
    }

    @PostMapping
    public ResponseEntity<ResourceResponse> createResource(@Valid @RequestBody ResourceRequest request) {
        return ResponseEntity.ok(trainingService.createResource(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResourceResponse> getResourceById(@PathVariable Long id) {
        return ResponseEntity.ok(trainingService.getResourceById(id));
    }

    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<List<ResourceResponse>> getResourcesByLesson(@PathVariable Long lessonId) {
        return ResponseEntity.ok(trainingService.getResourcesByLesson(lessonId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResourceResponse> updateResource(
            @PathVariable Long id,
            @Valid @RequestBody ResourceRequest request
    ) {
        return ResponseEntity.ok(trainingService.updateResource(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        trainingService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }
}
