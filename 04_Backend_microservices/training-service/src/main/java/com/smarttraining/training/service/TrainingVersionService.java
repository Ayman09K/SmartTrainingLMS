package com.smarttraining.training.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarttraining.training.dto.ResourceResponse;
import com.smarttraining.training.dto.TrainingVersionResponse;
import com.smarttraining.training.entity.Lesson;
import com.smarttraining.training.entity.PedagogicalResource;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.entity.TrainingModule;
import com.smarttraining.training.entity.TrainingVersion;
import com.smarttraining.training.enums.TrainingStatus;
import com.smarttraining.training.enums.TrainingVersionStatus;
import com.smarttraining.training.repository.LessonRepository;
import com.smarttraining.training.repository.PedagogicalResourceRepository;
import com.smarttraining.training.repository.TrainingModuleRepository;
import com.smarttraining.training.repository.TrainingVersionRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainingVersionService {

    private final TrainingVersionRepository versionRepository;
    private final TrainingModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final PedagogicalResourceRepository resourceRepository;
    private final ObjectMapper objectMapper;

    public TrainingVersionService(
            TrainingVersionRepository versionRepository,
            TrainingModuleRepository moduleRepository,
            LessonRepository lessonRepository,
            PedagogicalResourceRepository resourceRepository,
            ObjectMapper objectMapper
    ) {
        this.versionRepository = versionRepository;
        this.moduleRepository = moduleRepository;
        this.lessonRepository = lessonRepository;
        this.resourceRepository = resourceRepository;
        this.objectMapper = objectMapper;
    }

    public void requireEditable(Training training) {
        if (training == null || training.getStatus() != TrainingStatus.DRAFT) {
            throw new IllegalArgumentException(
                    "Le contenu d'une formation publiee ou archivee est immuable. Passez explicitement la formation en brouillon avant modification."
            );
        }
    }

    public void requireEditable(TrainingModule module) {
        if (module == null) {
            throw new IllegalArgumentException("Module introuvable");
        }
        requireEditable(module.getTraining());
    }

    public void requireEditable(Lesson lesson) {
        if (lesson == null || lesson.getModule() == null) {
            throw new IllegalArgumentException("Lecon introuvable");
        }
        requireEditable(lesson.getModule());
    }

    public void requireEditable(PedagogicalResource resource) {
        if (resource == null || resource.getLesson() == null) {
            throw new IllegalArgumentException("Ressource introuvable");
        }
        requireEditable(resource.getLesson());
    }

    @Transactional
    public TrainingVersionResponse publishSnapshot(Training training, Long actorId) {
        requireEditable(training);
        validateForPublication(training);

        String snapshotJson = buildSnapshot(training);
        String contentHash = sha256(snapshotJson);

        List<TrainingVersion> publishedVersions =
                versionRepository.findByTraining_IdAndStatus(
                        training.getId(),
                        TrainingVersionStatus.PUBLISHED
                );

        for (TrainingVersion previous : publishedVersions) {
            previous.markSuperseded();
        }
        versionRepository.saveAll(publishedVersions);

        int nextVersion = versionRepository
                .findFirstByTraining_IdOrderByVersionNumberDesc(training.getId())
                .map(v -> v.getVersionNumber() + 1)
                .orElse(1);

        TrainingVersion version = new TrainingVersion(
                training,
                nextVersion,
                TrainingVersionStatus.PUBLISHED,
                snapshotJson,
                contentHash,
                actorId
        );

        TrainingVersion saved = versionRepository.save(version);
        training.setCurrentVersionNumber(nextVersion);

        return new TrainingVersionResponse(saved, true);
    }

    @Transactional
    public void captureLegacyPublishedIfMissing(Training training, Long actorId) {
        if (training == null
                || training.getStatus() == null
                || training.getStatus().normalized() != TrainingStatus.PUBLISHED) {
            return;
        }

        if (versionRepository
                .findFirstByTraining_IdOrderByVersionNumberDesc(training.getId())
                .isPresent()) {
            return;
        }

        String snapshotJson = buildSnapshot(training);
        String contentHash = sha256(snapshotJson);

        TrainingVersion baseline = new TrainingVersion(
                training,
                1,
                TrainingVersionStatus.PUBLISHED,
                snapshotJson,
                contentHash,
                actorId
        );

        versionRepository.save(baseline);
        training.setCurrentVersionNumber(1);
    }

    @Transactional
    public void archiveCurrentPublished(Training training) {
        List<TrainingVersion> publishedVersions =
                versionRepository.findByTraining_IdAndStatus(
                        training.getId(),
                        TrainingVersionStatus.PUBLISHED
                );

        for (TrainingVersion version : publishedVersions) {
            version.markArchived();
        }

        versionRepository.saveAll(publishedVersions);
    }

    @Transactional(readOnly = true)
    public List<TrainingVersionResponse> listVersions(Long trainingId) {
        return versionRepository
                .findByTraining_IdOrderByVersionNumberDesc(trainingId)
                .stream()
                .map(version -> new TrainingVersionResponse(version, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public TrainingVersionResponse getVersion(Long trainingId, Integer versionNumber) {
        TrainingVersion version = versionRepository
                .findByTraining_IdAndVersionNumber(trainingId, versionNumber)
                .orElseThrow(() -> new IllegalArgumentException("Version de formation introuvable"));

        return new TrainingVersionResponse(version, true);
    }

    private void validateForPublication(Training training) {
        if (training.getTitle() == null || training.getTitle().isBlank()) {
            throw new IllegalArgumentException("Le titre de la formation est obligatoire avant publication");
        }

        if (training.getLevel() == null) {
            throw new IllegalArgumentException("Le niveau de la formation est obligatoire avant publication");
        }

        List<TrainingModule> modules =
                moduleRepository.findByTrainingIdOrderByOrderIndexAsc(training.getId());

        if (modules.isEmpty()) {
            throw new IllegalArgumentException("Une formation doit contenir au moins un module avant publication");
        }

        for (TrainingModule module : modules) {
            if (module.getOrderIndex() == null || module.getOrderIndex() <= 0) {
                throw new IllegalArgumentException("L'ordre des modules doit etre strictement positif");
            }

            List<Lesson> lessons =
                    lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId());

            if (lessons.isEmpty()) {
                throw new IllegalArgumentException("Chaque module doit contenir au moins une lecon avant publication");
            }

            for (Lesson lesson : lessons) {
                if (lesson.getOrderIndex() == null || lesson.getOrderIndex() <= 0) {
                    throw new IllegalArgumentException("L'ordre des lecons doit etre strictement positif");
                }
            }
        }
    }

    private String buildSnapshot(Training training) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("schemaVersion", "B7-1");
        snapshot.put("trainingId", training.getId());
        snapshot.put("title", training.getTitle());
        snapshot.put("shortDescription", training.getShortDescription());
        snapshot.put("description", training.getDescription());
        snapshot.put("objectives", training.getObjectives());
        snapshot.put("prerequisites", training.getPrerequisites());
        snapshot.put("targetAudience", training.getTargetAudience());
        snapshot.put("category", training.getCategory());
        snapshot.put("language", training.getLanguage());
        snapshot.put("coverImageUrl", training.getCoverImageUrl());
        snapshot.put("level", training.getLevel());
        snapshot.put("estimatedDurationHours", training.getEstimatedDurationHours());
        snapshot.put("visibility", training.getVisibility());
        snapshot.put("enrollmentMode", training.getEnrollmentMode());

        List<Map<String, Object>> moduleSnapshots = new ArrayList<>();

        List<TrainingModule> modules =
                moduleRepository.findByTrainingIdOrderByOrderIndexAsc(training.getId());

        for (TrainingModule module : modules) {
            Map<String, Object> moduleSnapshot = new LinkedHashMap<>();
            moduleSnapshot.put("id", module.getId());
            moduleSnapshot.put("title", module.getTitle());
            moduleSnapshot.put("description", module.getDescription());
            moduleSnapshot.put("orderIndex", module.getOrderIndex());
            moduleSnapshot.put("required", module.getRequired());
            moduleSnapshot.put("estimatedDurationMinutes", module.getEstimatedDurationMinutes());

            List<Map<String, Object>> lessonSnapshots = new ArrayList<>();
            List<Lesson> lessons =
                    lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId());

            for (Lesson lesson : lessons) {
                Map<String, Object> lessonSnapshot = new LinkedHashMap<>();
                lessonSnapshot.put("id", lesson.getId());
                lessonSnapshot.put("title", lesson.getTitle());
                lessonSnapshot.put("description", lesson.getDescription());
                lessonSnapshot.put("objective", lesson.getObjective());
                lessonSnapshot.put("content", lesson.getContent());
                lessonSnapshot.put("orderIndex", lesson.getOrderIndex());
                lessonSnapshot.put("estimatedDurationMinutes", lesson.getEstimatedDurationMinutes());
                lessonSnapshot.put("required", lesson.getRequired());
                lessonSnapshot.put("completionRule", lesson.getCompletionRule());

                List<ResourceResponse> resourceSnapshots =
                        resourceRepository.findByLessonIdOrderByOrderIndexAsc(lesson.getId())
                                .stream()
                                .map(ResourceResponse::new)
                                .toList();

                lessonSnapshot.put("resources", resourceSnapshots);
                lessonSnapshots.add(lessonSnapshot);
            }

            moduleSnapshot.put("lessons", lessonSnapshots);
            moduleSnapshots.add(moduleSnapshot);
        }

        snapshot.put("modules", moduleSnapshots);

        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Impossible de construire le snapshot de publication", exception);
        }
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);

            for (byte item : hash) {
                hex.append(String.format("%02x", item & 0xff));
            }

            return hex.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponible", exception);
        }
    }
}
