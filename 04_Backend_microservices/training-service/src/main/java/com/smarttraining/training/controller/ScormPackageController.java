package com.smarttraining.training.controller;

import com.smarttraining.training.dto.ScormUploadResponse;
import com.smarttraining.training.service.ScormImportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/scorm")
public class ScormPackageController {

    private final ScormImportService scormImportService;

    public ScormPackageController(ScormImportService scormImportService) {
        this.scormImportService = scormImportService;
    }

    @GetMapping("/status")
    public ResponseEntity<String> status() {
        return ResponseEntity.ok("scorm module is running");
    }

    @GetMapping("/packages/{id}")
    public ResponseEntity<ScormUploadResponse> getScormPackage(@PathVariable Long id) {
        return ResponseEntity.ok(scormImportService.getScormPackage(id));
    }
}
