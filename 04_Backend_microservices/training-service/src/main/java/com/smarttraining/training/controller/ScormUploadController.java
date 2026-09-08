package com.smarttraining.training.controller;

import com.smarttraining.training.dto.ScormUploadResponse;
import com.smarttraining.training.service.ScormImportService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/uploads")
public class ScormUploadController {

    private final ScormImportService scormImportService;

    public ScormUploadController(ScormImportService scormImportService) {
        this.scormImportService = scormImportService;
    }

    @PostMapping(
            value = "/lessons/{lessonId}/scorm",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<ScormUploadResponse> uploadScormPackage(
            @PathVariable Long lessonId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) Long uploadedBy,
            @RequestParam(required = false) Integer orderIndex
    ) {
        return ResponseEntity.ok(scormImportService.importScormPackage(
                lessonId,
                file,
                title,
                description,
                uploadedBy,
                orderIndex
        ));
    }
}
