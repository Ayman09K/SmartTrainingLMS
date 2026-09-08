package com.smarttraining.training.controller;

import com.smarttraining.training.dto.TrainingCategoryRequest;
import com.smarttraining.training.dto.TrainingCategoryResponse;
import com.smarttraining.training.service.TrainingCategoryService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/training-categories")
public class TrainingCategoryController {

    private final TrainingCategoryService categoryService;

    public TrainingCategoryController(
            TrainingCategoryService categoryService
    ) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public ResponseEntity<List<TrainingCategoryResponse>> listActiveForStaff() {
        return ResponseEntity.ok(
                categoryService.listActiveForStaff()
        );
    }

    @GetMapping("/admin")
    public ResponseEntity<List<TrainingCategoryResponse>> listAllForAdmin() {
        return ResponseEntity.ok(
                categoryService.listAllForAdmin()
        );
    }

    @PostMapping
    public ResponseEntity<TrainingCategoryResponse> create(
            @Valid @RequestBody TrainingCategoryRequest request
    ) {
        return ResponseEntity.ok(
                categoryService.create(request)
        );
    }

    @PutMapping("/{categoryId}")
    public ResponseEntity<TrainingCategoryResponse> update(
            @PathVariable Long categoryId,
            @Valid @RequestBody TrainingCategoryRequest request
    ) {
        return ResponseEntity.ok(
                categoryService.update(categoryId, request)
        );
    }
}