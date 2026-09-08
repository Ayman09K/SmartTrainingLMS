package com.smarttraining.training.controller;

import com.smarttraining.training.dto.FullTrainingResponse;
import com.smarttraining.training.dto.LearnerCatalogTrainingResponse;
import com.smarttraining.training.dto.TrainingRequest;
import com.smarttraining.training.dto.TrainingResponse;
import com.smarttraining.training.service.TrainingService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trainings")
public class TrainingController {

    private final TrainingService trainingService;

    public TrainingController(TrainingService trainingService) {
        this.trainingService = trainingService;
    }

    @GetMapping("/status")
    public ResponseEntity<String> status() {
        return ResponseEntity.ok("training-service is running");
    }

    @PostMapping
    public ResponseEntity<TrainingResponse> createTraining(@Valid @RequestBody TrainingRequest request) {
        return ResponseEntity.ok(trainingService.createTraining(request));
    }

    @GetMapping
    public ResponseEntity<List<TrainingResponse>> getAllTrainings() {
        return ResponseEntity.ok(trainingService.getAllTrainings());
    }

    @GetMapping("/admin")
    public ResponseEntity<List<TrainingResponse>> getAdminTrainings() {
        return ResponseEntity.ok(trainingService.getAdminTrainings());
    }

    @GetMapping("/catalog")
    public ResponseEntity<List<LearnerCatalogTrainingResponse>> getCatalogTrainings() {
        return ResponseEntity.ok(
                trainingService.getCatalogTrainings()
                        .stream()
                        .map(LearnerCatalogTrainingResponse::new)
                        .toList()
        );
    }

    @GetMapping("/published")
    public ResponseEntity<List<TrainingResponse>> getPublishedTrainings() {
        return ResponseEntity.ok(trainingService.getPublishedTrainings());
    }

    @GetMapping("/search")
    public ResponseEntity<List<TrainingResponse>> searchTrainings(@RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(trainingService.searchTrainings(keyword));
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<TrainingResponse>> getTrainingsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(trainingService.getTrainingsByCategory(category));
    }

    @GetMapping("/trainer/{trainerId}")
    public ResponseEntity<List<TrainingResponse>> getTrainingsByTrainer(@PathVariable Long trainerId) {
        return ResponseEntity.ok(trainingService.getTrainingsByTrainer(trainerId));
    }

    @GetMapping("/{id}/full")
    public ResponseEntity<FullTrainingResponse> getFullTrainingById(@PathVariable Long id) {
        return ResponseEntity.ok(trainingService.getFullTrainingById(id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TrainingResponse> getTrainingById(@PathVariable Long id) {
        return ResponseEntity.ok(trainingService.getTrainingById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TrainingResponse> updateTraining(
            @PathVariable Long id,
            @Valid @RequestBody TrainingRequest request
    ) {
        return ResponseEntity.ok(trainingService.updateTraining(id, request));
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<TrainingResponse> publishTraining(@PathVariable Long id) {
        return ResponseEntity.ok(trainingService.publishTraining(id));
    }

    @PutMapping("/{id}/archive")
    public ResponseEntity<TrainingResponse> archiveTraining(@PathVariable Long id) {
        return ResponseEntity.ok(trainingService.archiveTraining(id));
    }

    @PutMapping("/{id}/draft")
    public ResponseEntity<TrainingResponse> moveTrainingToDraft(@PathVariable Long id) {
        return ResponseEntity.ok(trainingService.moveTrainingToDraft(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTraining(@PathVariable Long id) {
        trainingService.deleteTraining(id);
        return ResponseEntity.noContent().build();
    }
}
