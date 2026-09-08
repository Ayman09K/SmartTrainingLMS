package com.smarttraining.training.controller;

import com.smarttraining.training.dto.ScormQuickCreateAnalysisResponse;
import com.smarttraining.training.dto.ScormQuickCreateConfirmRequest;
import com.smarttraining.training.dto.ScormQuickCreateConfirmResponse;
import com.smarttraining.training.service.ScormQuickCreateService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/scorm/quick-create")
public class ScormQuickCreateController {

    private final ScormQuickCreateService quickCreateService;

    public ScormQuickCreateController(ScormQuickCreateService quickCreateService) {
        this.quickCreateService = quickCreateService;
    }

    @PostMapping(
            value = "/analyze",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<ScormQuickCreateAnalysisResponse> analyze(
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(quickCreateService.analyze(file));
    }

    @GetMapping("/{temporaryImportId}/preview")
    public ResponseEntity<ScormQuickCreateAnalysisResponse> preview(
            @PathVariable String temporaryImportId
    ) {
        return ResponseEntity.ok(quickCreateService.preview(temporaryImportId));
    }

    @PostMapping("/{temporaryImportId}/confirm")
    public ResponseEntity<ScormQuickCreateConfirmResponse> confirm(
            @PathVariable String temporaryImportId,
            @Valid @RequestBody ScormQuickCreateConfirmRequest request
    ) {
        return ResponseEntity.ok(
                quickCreateService.confirm(temporaryImportId, request)
        );
    }
}
