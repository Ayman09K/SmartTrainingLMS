package com.smarttraining.training.service;

import com.smarttraining.training.dto.FileUploadResponse;
import com.smarttraining.training.dto.TrainingResponse;
import com.smarttraining.training.entity.Lesson;
import com.smarttraining.training.entity.PedagogicalResource;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.enums.ResourceType;
import com.smarttraining.training.enums.StorageMode;
import com.smarttraining.training.repository.LessonRepository;
import com.smarttraining.training.repository.PedagogicalResourceRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.TrainingOwnershipService;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ResourceUploadService {

    private final TrainingRepository trainingRepository;
    private final LessonRepository lessonRepository;
    private final PedagogicalResourceRepository resourceRepository;
    private final TrainingOwnershipService ownershipService;
    private final TrainingVersionService versionService;

    public ResourceUploadService(
            TrainingRepository trainingRepository,
            LessonRepository lessonRepository,
            PedagogicalResourceRepository resourceRepository,
            TrainingOwnershipService ownershipService,
            TrainingVersionService versionService
    ) {
        this.trainingRepository = trainingRepository;
        this.lessonRepository = lessonRepository;
        this.resourceRepository = resourceRepository;
        this.ownershipService = ownershipService;
        this.versionService = versionService;
    }

    public void assertCanUploadCover(Long trainingId) {
        Training training = trainingRepository.findById(trainingId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable"));

        ownershipService.assertCanManageTraining(training);
        versionService.requireEditable(training);
    }

    public void assertCanUploadToLesson(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Leçon introuvable"));

        ownershipService.assertCanManageLesson(lesson);
        versionService.requireEditable(lesson);
    }

    public FileUploadResponse attachCoverToTraining(Long trainingId, FileUploadResponse fileResponse) {
        Training training = trainingRepository.findById(trainingId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable"));

        ownershipService.assertCanManageTraining(training);
        versionService.requireEditable(training);

        training.setCoverImageUrl(fileResponse.getPublicUrl());
        training.setCoverImagePath(fileResponse.getRelativePath());

        trainingRepository.save(training);

        fileResponse.setTrainingId(trainingId);
        fileResponse.setResourceType(ResourceType.IMAGE);
        fileResponse.setMessage("Image de couverture associée à la formation");

        return fileResponse;
    }

    public FileUploadResponse createLessonResourceFromUpload(
            Long lessonId,
            ResourceType type,
            FileUploadResponse fileResponse,
            String title,
            String description,
            Long uploadedBy,
            Integer orderIndex,
            Integer durationSeconds
    ) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Leçon introuvable"));

        ownershipService.assertCanManageLesson(lesson);
        versionService.requireEditable(lesson);

        PedagogicalResource resource = new PedagogicalResource();
        resource.setLesson(lesson);
        resource.setTitle(resolveTitle(title, fileResponse.getOriginalFileName()));
        resource.setDescription(description);
        resource.setType(type);
        resource.setStorageMode(StorageMode.LOCAL_FILE);
        resource.setUrl(fileResponse.getPublicUrl());
        resource.setPublicUrl(fileResponse.getPublicUrl());
        resource.setRelativePath(fileResponse.getRelativePath());
        resource.setOriginalFileName(fileResponse.getOriginalFileName());
        resource.setStoredFileName(fileResponse.getStoredFileName());
        resource.setMimeType(fileResponse.getMimeType());
        resource.setFileSize(fileResponse.getFileSize());
        resource.setUploadedBy(ownershipService.getActorId());
        resource.setUploadedAt(LocalDateTime.now());
        resource.setDurationSeconds(durationSeconds);
        resource.setActive(true);
        resource.setOrderIndex(resolveOrderIndex(lessonId, orderIndex));

        PedagogicalResource savedResource = resourceRepository.save(resource);

        fileResponse.setLessonId(lessonId);
        fileResponse.setResourceId(savedResource.getId());
        fileResponse.setResourceType(type);
        fileResponse.setMessage("Fichier importé et ressource pédagogique créée");

        return fileResponse;
    }

    public TrainingResponse getTrainingAfterCoverUpload(Long trainingId) {
        Training training = trainingRepository.findById(trainingId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable"));

        return new TrainingResponse(training);
    }

    private String resolveTitle(String title, String originalFileName) {
        if (title != null && !title.isBlank()) {
            return title;
        }

        return originalFileName == null || originalFileName.isBlank()
                ? "Ressource importée"
                : originalFileName;
    }

    private Integer resolveOrderIndex(Long lessonId, Integer orderIndex) {
        if (orderIndex != null && orderIndex > 0) {
            return orderIndex;
        }

        return (int) resourceRepository.countByLessonId(lessonId) + 1;
    }
}
