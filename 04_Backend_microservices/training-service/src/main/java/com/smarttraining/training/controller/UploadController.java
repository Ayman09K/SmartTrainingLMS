package com.smarttraining.training.controller;

import com.smarttraining.training.config.UploadProperties;
import com.smarttraining.training.dto.FileUploadResponse;
import com.smarttraining.training.enums.ResourceType;
import com.smarttraining.training.service.FileStorageService;
import com.smarttraining.training.service.LearningPathCoverService;
import com.smarttraining.training.service.ResourceUploadService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/uploads")
public class UploadController {

    private final FileStorageService fileStorageService;
    private final ResourceUploadService resourceUploadService;
    private final LearningPathCoverService learningPathCoverService;
    private final UploadProperties uploadProperties;

    public UploadController(
            FileStorageService fileStorageService,
            ResourceUploadService resourceUploadService,
            LearningPathCoverService learningPathCoverService,
            UploadProperties uploadProperties
    ) {
        this.fileStorageService = fileStorageService;
        this.resourceUploadService = resourceUploadService;
        this.learningPathCoverService = learningPathCoverService;
        this.uploadProperties = uploadProperties;
    }

    @GetMapping("/status")
    public ResponseEntity<String> status() {
        return ResponseEntity.ok("upload module is running");
    }

    @PostMapping(
            value = "/trainings/{trainingId}/cover",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<FileUploadResponse> uploadTrainingCover(
            @PathVariable Long trainingId,
            @RequestParam("file") MultipartFile file
    ) {
        // Vérifier l'ownership AVANT d'écrire le fichier sur disque.
        resourceUploadService.assertCanUploadCover(trainingId);

        FileUploadResponse storedFile = fileStorageService.store(
                file,
                "trainings/" + trainingId + "/cover",
                uploadProperties.getAllowedImageTypes(),
                uploadProperties.getMaxImageSizeBytes()
        );

        return ResponseEntity.ok(resourceUploadService.attachCoverToTraining(trainingId, storedFile));
    }

    @PostMapping(
            value = "/learning-paths/{pathId}/cover",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<FileUploadResponse> uploadLearningPathCover(
            @PathVariable Long pathId,
            @RequestParam("file") MultipartFile file
    ) {
        // Vérifier l'ownership AVANT d'écrire le fichier sur disque.
        learningPathCoverService.assertCanUploadCover(pathId);

        FileUploadResponse storedFile = fileStorageService.store(
                file,
                "learning-paths/" + pathId + "/cover",
                uploadProperties.getAllowedImageTypes(),
                uploadProperties.getMaxImageSizeBytes()
        );

        return ResponseEntity.ok(
                learningPathCoverService.attachCoverToPath(
                        pathId,
                        storedFile
                )
        );
    }

    @PostMapping(
            value = "/lessons/{lessonId}/image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<FileUploadResponse> uploadLessonImage(
            @PathVariable Long lessonId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) Long uploadedBy,
            @RequestParam(required = false) Integer orderIndex
    ) {
        // Vérifier l\'ownership AVANT d\'écrire le fichier sur disque.
        resourceUploadService.assertCanUploadToLesson(lessonId);

        FileUploadResponse storedFile = fileStorageService.store(
                file,
                "lessons/" + lessonId + "/images",
                uploadProperties.getAllowedImageTypes(),
                uploadProperties.getMaxImageSizeBytes()
        );

        return ResponseEntity.ok(resourceUploadService.createLessonResourceFromUpload(
                lessonId,
                ResourceType.IMAGE,
                storedFile,
                title,
                description,
                uploadedBy,
                orderIndex,
                null
        ));
    }

    @PostMapping(
            value = "/lessons/{lessonId}/video",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<FileUploadResponse> uploadLessonVideo(
            @PathVariable Long lessonId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) Long uploadedBy,
            @RequestParam(required = false) Integer orderIndex,
            @RequestParam(required = false) Integer durationSeconds
    ) {
        // Vérifier l\'ownership AVANT d\'écrire le fichier sur disque.
        resourceUploadService.assertCanUploadToLesson(lessonId);

        FileUploadResponse storedFile = fileStorageService.store(
                file,
                "lessons/" + lessonId + "/videos",
                uploadProperties.getAllowedVideoTypes(),
                uploadProperties.getMaxVideoSizeBytes()
        );

        return ResponseEntity.ok(resourceUploadService.createLessonResourceFromUpload(
                lessonId,
                ResourceType.VIDEO,
                storedFile,
                title,
                description,
                uploadedBy,
                orderIndex,
                durationSeconds
        ));
    }

    @PostMapping(
            value = "/lessons/{lessonId}/pdf",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<FileUploadResponse> uploadLessonPdf(
            @PathVariable Long lessonId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) Long uploadedBy,
            @RequestParam(required = false) Integer orderIndex
    ) {
        // Vérifier l\'ownership AVANT d\'écrire le fichier sur disque.
        resourceUploadService.assertCanUploadToLesson(lessonId);

        FileUploadResponse storedFile = fileStorageService.store(
                file,
                "lessons/" + lessonId + "/pdf",
                uploadProperties.getAllowedPdfTypes(),
                uploadProperties.getMaxPdfSizeBytes()
        );

        return ResponseEntity.ok(resourceUploadService.createLessonResourceFromUpload(
                lessonId,
                ResourceType.PDF,
                storedFile,
                title,
                description,
                uploadedBy,
                orderIndex,
                null
        ));
    }

    @PostMapping(
            value = "/lessons/{lessonId}/document",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<FileUploadResponse> uploadLessonDocument(
            @PathVariable Long lessonId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) Long uploadedBy,
            @RequestParam(required = false) Integer orderIndex
    ) {
        // Vérifier l\'ownership AVANT d\'écrire le fichier sur disque.
        resourceUploadService.assertCanUploadToLesson(lessonId);

        FileUploadResponse storedFile = fileStorageService.store(
                file,
                "lessons/" + lessonId + "/documents",
                uploadProperties.getAllowedDocumentTypes(),
                uploadProperties.getMaxDocumentSizeBytes()
        );

        return ResponseEntity.ok(resourceUploadService.createLessonResourceFromUpload(
                lessonId,
                ResourceType.DOCUMENT,
                storedFile,
                title,
                description,
                uploadedBy,
                orderIndex,
                null
        ));
    }
}
