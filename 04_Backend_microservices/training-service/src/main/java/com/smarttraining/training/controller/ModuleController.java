package com.smarttraining.training.controller;

import com.smarttraining.training.dto.ModuleRequest;
import com.smarttraining.training.dto.ModuleResponse;
import com.smarttraining.training.service.TrainingService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/modules")
public class ModuleController {

    private final TrainingService trainingService;

    public ModuleController(TrainingService trainingService) {
        this.trainingService = trainingService;
    }

    @PostMapping
    public ResponseEntity<ModuleResponse> createModule(@Valid @RequestBody ModuleRequest request) {
        return ResponseEntity.ok(trainingService.createModule(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ModuleResponse> getModuleById(@PathVariable Long id) {
        return ResponseEntity.ok(trainingService.getModuleById(id));
    }

    @GetMapping("/training/{trainingId}")
    public ResponseEntity<List<ModuleResponse>> getModulesByTraining(@PathVariable Long trainingId) {
        return ResponseEntity.ok(trainingService.getModulesByTraining(trainingId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ModuleResponse> updateModule(
            @PathVariable Long id,
            @Valid @RequestBody ModuleRequest request
    ) {
        return ResponseEntity.ok(trainingService.updateModule(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteModule(@PathVariable Long id) {
        trainingService.deleteModule(id);
        return ResponseEntity.noContent().build();
    }
}