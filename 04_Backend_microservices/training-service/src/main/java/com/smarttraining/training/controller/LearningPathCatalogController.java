package com.smarttraining.training.controller;

import com.smarttraining.training.dto.LearningPathCatalogResponse;
import com.smarttraining.training.service.LearningPathCatalogService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trainings/learning-paths/catalog")
public class LearningPathCatalogController {

    private final LearningPathCatalogService catalogService;

    public LearningPathCatalogController(
            LearningPathCatalogService catalogService
    ) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public ResponseEntity<List<LearningPathCatalogResponse>>
            getCatalog() {
        return ResponseEntity.ok(
                catalogService.getCatalog()
        );
    }

    @GetMapping("/{pathId}")
    public ResponseEntity<LearningPathCatalogResponse>
            getCatalogDetail(
                    @PathVariable Long pathId
            ) {
        return ResponseEntity.ok(
                catalogService.getCatalogDetail(pathId)
        );
    }
}