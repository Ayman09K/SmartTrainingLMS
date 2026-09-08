package com.smarttraining.training.controller;

import com.smarttraining.training.dto.LessonRequest;
import com.smarttraining.training.dto.LessonResponse;
import com.smarttraining.training.service.TrainingService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/lessons")
public class LessonController {

    private final TrainingService trainingService;

    public LessonController(TrainingService trainingService) {
        this.trainingService = trainingService;
    }

    @PostMapping
    public ResponseEntity<LessonResponse> createLesson(@Valid @RequestBody LessonRequest request) {
        return ResponseEntity.ok(trainingService.createLesson(request));
    }


	@GetMapping("/{id}")
	public ResponseEntity<LessonResponse> getLessonById(@PathVariable Long id) {
		return ResponseEntity.ok(trainingService.getLessonById(id));
	}

    @GetMapping("/module/{moduleId}")
    public ResponseEntity<List<LessonResponse>> getLessonsByModule(@PathVariable Long moduleId) {
        return ResponseEntity.ok(trainingService.getLessonsByModule(moduleId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LessonResponse> updateLesson(
            @PathVariable Long id,
            @Valid @RequestBody LessonRequest request
    ) {
        return ResponseEntity.ok(trainingService.updateLesson(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLesson(@PathVariable Long id) {
        trainingService.deleteLesson(id);
        return ResponseEntity.noContent().build();
    }
}
