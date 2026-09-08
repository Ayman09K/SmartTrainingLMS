package com.smarttraining.training.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarttraining.training.config.UploadProperties;
import com.smarttraining.training.dto.ScormQuickCreateAnalysisResponse;
import com.smarttraining.training.dto.ScormQuickCreateConfirmRequest;
import com.smarttraining.training.dto.ScormQuickCreateConfirmResponse;
import com.smarttraining.training.dto.ScormQuickCreatePreviewLesson;
import com.smarttraining.training.dto.ScormQuickCreatePreviewModule;
import com.smarttraining.training.entity.Lesson;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.entity.TrainingCategory;
import com.smarttraining.training.entity.TrainingModule;
import com.smarttraining.training.enums.EnrollmentMode;
import com.smarttraining.training.enums.LessonCompletionRule;
import com.smarttraining.training.enums.ScormQuickCreateMode;
import com.smarttraining.training.enums.TrainingStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import com.smarttraining.training.repository.LessonRepository;
import com.smarttraining.training.repository.TrainingCategoryRepository;
import com.smarttraining.training.repository.TrainingModuleRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.TrainingOwnershipService;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

@Service
public class ScormQuickCreateService {

    private static final int MAX_STRUCTURED_SCO = 50;
    private static final long STAGING_TTL_MINUTES = 60L;
    private static final long STALE_DIRECTORY_HOURS = 3L;

    private final ScormImportService scormImportService;
    private final TrainingOwnershipService ownershipService;
    private final TrainingRepository trainingRepository;
    private final TrainingCategoryRepository categoryRepository;
    private final TrainingModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final UploadProperties uploadProperties;
    private final ObjectMapper objectMapper;
    private final Path stagingRoot;
    private final ConcurrentHashMap<String, Object> confirmLocks = new ConcurrentHashMap<>();

    public ScormQuickCreateService(
            ScormImportService scormImportService,
            TrainingOwnershipService ownershipService,
            TrainingRepository trainingRepository,
            TrainingCategoryRepository categoryRepository,
            TrainingModuleRepository moduleRepository,
            LessonRepository lessonRepository,
            UploadProperties uploadProperties,
            ObjectMapper objectMapper
    ) {
        this.scormImportService = scormImportService;
        this.ownershipService = ownershipService;
        this.trainingRepository = trainingRepository;
        this.categoryRepository = categoryRepository;
        this.moduleRepository = moduleRepository;
        this.lessonRepository = lessonRepository;
        this.uploadProperties = uploadProperties;
        this.objectMapper = objectMapper;
        this.stagingRoot = Paths.get(
                System.getProperty("java.io.tmpdir"),
                "smarttraining-scorm-quick-create"
        ).toAbsolutePath().normalize();
    }

    public ScormQuickCreateAnalysisResponse analyze(MultipartFile file) {
        ownershipService.requireAdminOrTrainer();
        cleanupExpiredStaging();
        scormImportService.validateScormZip(file);

        String temporaryImportId = UUID.randomUUID().toString();
        Path stagingDirectory = resolveStagingDirectory(temporaryImportId);
        Path stagedZip = stagingDirectory.resolve("package.zip").normalize();
        Path analysisDirectory = stagingDirectory.resolve("analysis-content").normalize();

        try {
            Files.createDirectories(stagingDirectory);
            Files.createDirectories(analysisDirectory);

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, stagedZip, StandardCopyOption.REPLACE_EXISTING);
            }

            scormImportService.extractZipSafely(stagedZip, analysisDirectory);

            Path manifestPath = scormImportService.findRequiredFile(
                    analysisDirectory,
                    "imsmanifest.xml"
            );

            scormImportService.findLaunchFile(
                    analysisDirectory,
                    manifestPath
            );

            ManifestInspection inspection = inspectManifest(manifestPath);
            String checksum = sha256(stagedZip);
            String originalFileName = cleanOriginalFileName(file.getOriginalFilename());
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime expiresAt = now.plusMinutes(STAGING_TTL_MINUTES);

            StagedMetadata metadata = new StagedMetadata();
            metadata.ownerId = ownershipService.getActorId();
            metadata.createdAt = now;
            metadata.expiresAt = expiresAt;
            metadata.originalFileName = originalFileName;
            metadata.contentType = file.getContentType();
            metadata.checksumSha256 = checksum;
            metadata.scormVersion = inspection.scormVersion;
            metadata.detectedTitle = resolveDetectedTitle(
                    inspection.detectedTitle,
                    originalFileName
            );
            metadata.organizationTitle = inspection.organizationTitle;
            metadata.itemCount = inspection.itemCount;
            metadata.scoCount = inspection.scoCount;
            metadata.structuredAvailable = inspection.structuredAvailable;
            metadata.modules = inspection.modules;

            deleteRecursively(analysisDirectory);

            Path metadataPath = stagingDirectory.resolve("analysis.json").normalize();
            objectMapper.writeValue(metadataPath.toFile(), metadata);

            return toResponse(temporaryImportId, metadata);
        } catch (Exception exception) {
            deleteRecursivelyQuietly(stagingDirectory);

            if (exception instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }

            throw new IllegalArgumentException(
                    "Impossible d'analyser le package SCORM : " + exception.getMessage(),
                    exception
            );
        }
    }

    public ScormQuickCreateAnalysisResponse preview(String temporaryImportId) {
        StagedMetadata metadata = readOwnedMetadata(temporaryImportId);
        return toResponse(temporaryImportId, metadata);
    }

    @Transactional
    public ScormQuickCreateConfirmResponse confirm(
            String temporaryImportId,
            ScormQuickCreateConfirmRequest request
    ) {
        ownershipService.requireAdminOrTrainer();

        Object lock = confirmLocks.computeIfAbsent(
                temporaryImportId,
                ignored -> new Object()
        );

        synchronized (lock) {
            try {
                return confirmLocked(temporaryImportId, request);
            } finally {
                confirmLocks.remove(temporaryImportId, lock);
            }
        }
    }

    private ScormQuickCreateConfirmResponse confirmLocked(
            String temporaryImportId,
            ScormQuickCreateConfirmRequest request
    ) {
        StagedMetadata metadata = readOwnedMetadata(temporaryImportId);
        Path stagingDirectory = resolveStagingDirectory(temporaryImportId);
        Path stagedZip = stagingDirectory.resolve("package.zip").normalize();

        if (!Files.isRegularFile(stagedZip)) {
            throw new IllegalArgumentException("Package SCORM temporaire introuvable");
        }

        if (request == null) {
            throw new IllegalArgumentException("Les metadonnees de confirmation sont obligatoires");
        }

        TrainingCategory category = categoryRepository
                .findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Categorie introuvable"));

        if (!Boolean.TRUE.equals(category.getActive())) {
            throw new IllegalArgumentException(
                    "Cette categorie est inactive et ne peut plus etre attribuee"
            );
        }

        if (request.getLevel() == null) {
            throw new IllegalArgumentException("Le niveau est obligatoire");
        }

        ScormQuickCreateMode requestedMode = request.getMode() == null
                ? ScormQuickCreateMode.SAFE
                : request.getMode();

        ScormQuickCreateMode appliedMode =
                requestedMode == ScormQuickCreateMode.STRUCTURED
                        && Boolean.TRUE.equals(metadata.structuredAvailable)
                        ? ScormQuickCreateMode.STRUCTURED
                        : ScormQuickCreateMode.SAFE;

        Long actorId = ownershipService.getActorId();
        String trainingTitle = normalizeOptional(request.getTitle());

        if (trainingTitle == null) {
            trainingTitle = metadata.detectedTitle;
        }

        if (trainingTitle == null || trainingTitle.isBlank()) {
            throw new IllegalArgumentException("Le titre de la formation est obligatoire");
        }

        Training training = new Training();
        training.setTrainerId(actorId);
        training.setOwnerId(actorId);
        training.setTitle(trainingTitle);
        training.setShortDescription(normalizeOptional(request.getShortDescription()));
        training.setDescription(normalizeOptional(request.getDescription()));
        training.setObjectives(normalizeOptional(request.getObjectives()));
        training.setPrerequisites(normalizeOptional(request.getPrerequisites()));
        training.setTargetAudience(normalizeOptional(request.getTargetAudience()));
        training.setCategoryRef(category);
        training.setCategory(category.getName());
        training.setLanguage(
                request.getLanguage() == null || request.getLanguage().isBlank()
                        ? "fr"
                        : request.getLanguage().trim()
        );
        training.setLevel(request.getLevel());
        training.setEstimatedDurationHours(request.getEstimatedDurationHours());
        training.setStatus(TrainingStatus.DRAFT);
        training.setVisibility(
                request.getVisibility() == null
                        ? TrainingVisibility.PRIVATE
                        : request.getVisibility()
        );
        training.setEnrollmentMode(
                request.getEnrollmentMode() == null
                        ? EnrollmentMode.ASSIGNMENT_ONLY
                        : request.getEnrollmentMode()
        );
        training.setAccessCode(normalizeOptional(request.getAccessCode()));
        training.setMaxLearners(request.getMaxLearners());

        Training savedTraining = trainingRepository.save(training);

        List<Long> createdLessonIds = new ArrayList<>();
        int moduleCount = 0;
        int lessonCount = 0;
        int resourceCount = 0;

        // A single-SCO package has no useful internal hierarchy.
        // The title entered by the author remains the canonical pedagogical title.
        boolean canonicalSingleSco = appliedMode == ScormQuickCreateMode.STRUCTURED
                && metadata.modules.size() == 1
                && metadata.modules.get(0).lessons.size() == 1;

        try {
            if (appliedMode == ScormQuickCreateMode.STRUCTURED) {
                for (StagedModule stagedModule : metadata.modules) {
                    TrainingModule module = new TrainingModule(
                            canonicalSingleSco
                                    ? "Module interactif"
                                    : safeTitle(stagedModule.title, "Module SCORM"),
                            null,
                            moduleCount + 1,
                            savedTraining
                    );
                    module.setRequired(Boolean.TRUE);
                    TrainingModule savedModule = moduleRepository.save(module);
                    moduleCount++;

                    int lessonOrder = 0;

                    for (StagedLesson stagedLesson : stagedModule.lessons) {
                        Lesson lesson = new Lesson(
                                canonicalSingleSco
                                        ? trainingTitle
                                        : safeTitle(stagedLesson.title, "Contenu SCORM"),
                                null,
                                lessonOrder + 1,
                                null,
                                savedModule
                        );
                        lesson.setRequired(Boolean.TRUE);
                        lesson.setCompletionRule(LessonCompletionRule.SCORM_COMPLETED);

                        Lesson savedLesson = lessonRepository.save(lesson);
                        createdLessonIds.add(savedLesson.getId());
                        lessonCount++;
                        lessonOrder++;

                        scormImportService.importStagedScormPackage(
                                savedLesson.getId(),
                                stagedZip,
                                metadata.originalFileName,
                                metadata.contentType,
                                canonicalSingleSco
                                        ? trainingTitle
                                        : safeTitle(stagedLesson.title, metadata.detectedTitle),
                                null,
                                1,
                                stagedLesson.launchHref
                        );
                        resourceCount++;
                    }
                }
            } else {
                TrainingModule module = new TrainingModule(
                        "Module interactif",
                        null,
                        1,
                        savedTraining
                );
                module.setRequired(Boolean.TRUE);
                TrainingModule savedModule = moduleRepository.save(module);
                moduleCount = 1;

                Lesson lesson = new Lesson(
                        trainingTitle,
                        null,
                        1,
                        null,
                        savedModule
                );
                lesson.setRequired(Boolean.TRUE);
                lesson.setCompletionRule(LessonCompletionRule.SCORM_COMPLETED);
                Lesson savedLesson = lessonRepository.save(lesson);
                createdLessonIds.add(savedLesson.getId());
                lessonCount = 1;

                scormImportService.importStagedScormPackage(
                        savedLesson.getId(),
                        stagedZip,
                        metadata.originalFileName,
                        metadata.contentType,
                        trainingTitle,
                        null,
                        1,
                        null
                );
                resourceCount = 1;
            }

            deleteRecursively(stagingDirectory);

            String message = appliedMode == requestedMode
                    ? "Brouillon cree depuis le package SCORM"
                    : "Structure ambigue : brouillon cree automatiquement en mode SAFE";

            return new ScormQuickCreateConfirmResponse(
                    savedTraining.getId(),
                    savedTraining.getTitle(),
                    savedTraining.getStatus(),
                    appliedMode,
                    moduleCount,
                    lessonCount,
                    resourceCount,
                    metadata.checksumSha256,
                    message
            );
        } catch (Exception exception) {
            cleanupCreatedScormFiles(createdLessonIds);
            deleteRecursivelyQuietly(stagingDirectory);

            if (exception instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }

            throw new IllegalStateException(
                    "Creation du brouillon SCORM annulee : " + exception.getMessage(),
                    exception
            );
        }
    }

    private StagedMetadata readOwnedMetadata(String temporaryImportId) {
        ownershipService.requireAdminOrTrainer();

        Path stagingDirectory = resolveStagingDirectory(temporaryImportId);
        Path metadataPath = stagingDirectory.resolve("analysis.json").normalize();
        Path stagedZip = stagingDirectory.resolve("package.zip").normalize();

        if (!metadataPath.startsWith(stagingRoot)
                || !stagedZip.startsWith(stagingRoot)
                || !Files.isRegularFile(metadataPath)
                || !Files.isRegularFile(stagedZip)) {
            throw new IllegalArgumentException("Import SCORM temporaire introuvable");
        }

        try {
            StagedMetadata metadata = objectMapper.readValue(
                    metadataPath.toFile(),
                    StagedMetadata.class
            );

            if (metadata.ownerId == null
                    || !metadata.ownerId.equals(ownershipService.getActorId())) {
                throw new AccessDeniedException(
                        "Cet import SCORM temporaire appartient a un autre utilisateur"
                );
            }

            if (metadata.expiresAt == null
                    || LocalDateTime.now().isAfter(metadata.expiresAt)) {
                deleteRecursivelyQuietly(stagingDirectory);
                throw new IllegalArgumentException(
                        "Cet import SCORM temporaire a expire. Relancez l'analyse."
                );
            }

            String currentChecksum = sha256(stagedZip);

            if (metadata.checksumSha256 == null
                    || !metadata.checksumSha256.equalsIgnoreCase(currentChecksum)) {
                deleteRecursivelyQuietly(stagingDirectory);
                throw new IllegalArgumentException(
                        "Le package SCORM temporaire a ete modifie ou corrompu"
                );
            }

            return metadata;
        } catch (AccessDeniedException | IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException(
                    "Import SCORM temporaire invalide",
                    exception
            );
        }
    }

    private ManifestInspection inspectManifest(Path manifestPath) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature(
                    "http://apache.org/xml/features/disallow-doctype-decl",
                    true
            );
            factory.setFeature(
                    "http://xml.org/sax/features/external-general-entities",
                    false
            );
            factory.setFeature(
                    "http://xml.org/sax/features/external-parameter-entities",
                    false
            );
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);

            try {
                factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
                factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            } catch (IllegalArgumentException ignored) {
            }

            DocumentBuilder builder = factory.newDocumentBuilder();
            Document document = builder.parse(manifestPath.toFile());

            String schemaVersion = textOfFirstDescendant(
                    document.getDocumentElement(),
                    "schemaversion"
            );
            String scormVersion = normalizeScormVersion(schemaVersion);

            Map<String, String> resourceHrefs = new HashMap<>();
            boolean duplicateResourceIdentifier = false;

            for (Element resource : descendants(
                    document.getDocumentElement(),
                    "resource"
            )) {
                String identifier = trimToNull(resource.getAttribute("identifier"));
                String href = trimToNull(resource.getAttribute("href"));

                if (identifier == null) {
                    continue;
                }

                if (resourceHrefs.containsKey(identifier)) {
                    duplicateResourceIdentifier = true;
                }

                resourceHrefs.put(identifier, href);
            }

            Element organizations = firstDescendant(
                    document.getDocumentElement(),
                    "organizations"
            );

            List<Element> organizationList = organizations == null
                    ? List.of()
                    : directChildren(organizations, "organization");

            Element selectedOrganization = null;

            if (organizations != null) {
                String defaultId = trimToNull(
                        organizations.getAttribute("default")
                );

                if (defaultId != null) {
                    for (Element organization : organizationList) {
                        if (defaultId.equals(
                                trimToNull(organization.getAttribute("identifier"))
                        )) {
                            selectedOrganization = organization;
                            break;
                        }
                    }
                }
            }

            if (selectedOrganization == null && organizationList.size() == 1) {
                selectedOrganization = organizationList.get(0);
            }

            String organizationTitle = selectedOrganization == null
                    ? null
                    : directChildText(selectedOrganization, "title");

            String detectedTitle = organizationTitle;

            if (detectedTitle == null) {
                detectedTitle = textOfFirstDescendant(
                        document.getDocumentElement(),
                        "title"
                );
            }

            List<StagedModule> modules = new ArrayList<>();
            int itemCount = 0;
            int scoCount = 0;
            boolean deterministic =
                    selectedOrganization != null
                            && !duplicateResourceIdentifier;

            Set<String> launchHrefs = new HashSet<>();

            if (selectedOrganization != null) {
                List<Element> allItems = descendants(
                        selectedOrganization,
                        "item"
                );
                itemCount = allItems.size();

                List<Element> rootItems = directChildren(
                        selectedOrganization,
                        "item"
                );

                int moduleIndex = 0;

                for (Element rootItem : rootItems) {
                    StagedModule module = new StagedModule();
                    module.title = safeTitle(
                            directChildText(rootItem, "title"),
                            "Module SCORM " + (moduleIndex + 1)
                    );

                    List<Element> subtreeItems = new ArrayList<>();
                    collectItemSubtree(rootItem, subtreeItems);

                    for (Element item : subtreeItems) {
                        String identifierRef = trimToNull(
                                item.getAttribute("identifierref")
                        );

                        if (identifierRef == null) {
                            continue;
                        }

                        String href = resourceHrefs.get(identifierRef);

                        if (href == null
                                || !isSafeRelativeLaunchHref(href)
                                || !launchHrefs.add(href)) {
                            deterministic = false;
                            continue;
                        }

                        StagedLesson lesson = new StagedLesson();
                        lesson.title = safeTitle(
                                directChildText(item, "title"),
                                fileTitleFromHref(href)
                        );
                        lesson.launchHref = href;
                        module.lessons.add(lesson);
                        scoCount++;
                    }

                    if (!module.lessons.isEmpty()) {
                        modules.add(module);
                        moduleIndex++;
                    }
                }
            }

            if (scoCount == 0
                    || modules.isEmpty()
                    || scoCount > MAX_STRUCTURED_SCO) {
                deterministic = false;
            }

            ManifestInspection result = new ManifestInspection();
            result.scormVersion = scormVersion;
            result.detectedTitle = detectedTitle;
            result.organizationTitle = organizationTitle;
            result.itemCount = itemCount;
            result.scoCount = scoCount;
            result.structuredAvailable = deterministic;
            result.modules = deterministic ? modules : new ArrayList<>();

            return result;
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException(
                    "Manifest SCORM illisible ou non supporte",
                    exception
            );
        }
    }

    private String normalizeScormVersion(String rawSchemaVersion) {
        String value = rawSchemaVersion == null
                ? ""
                : rawSchemaVersion.trim().toUpperCase(Locale.ROOT);

        if (value.contains("1.2")) {
            return "SCORM_1_2";
        }

        if (value.contains("2004") || value.contains("1.3")) {
            return "SCORM_2004";
        }

        throw new IllegalArgumentException(
                "Version SCORM non reconnue ou non supportee"
        );
    }

    private ScormQuickCreateAnalysisResponse toResponse(
            String temporaryImportId,
            StagedMetadata metadata
    ) {
        List<ScormQuickCreatePreviewModule> preview = new ArrayList<>();

        if (Boolean.TRUE.equals(metadata.structuredAvailable)
                && metadata.modules != null
                && !metadata.modules.isEmpty()) {
            for (StagedModule stagedModule : metadata.modules) {
                List<ScormQuickCreatePreviewLesson> lessons = new ArrayList<>();

                for (StagedLesson stagedLesson : stagedModule.lessons) {
                    lessons.add(
                            new ScormQuickCreatePreviewLesson(stagedLesson.title)
                    );
                }

                preview.add(
                        new ScormQuickCreatePreviewModule(
                                stagedModule.title,
                                lessons
                        )
                );
            }
        } else {
            preview.add(
                    new ScormQuickCreatePreviewModule(
                            "Contenu SCORM",
                            List.of(
                                    new ScormQuickCreatePreviewLesson(
                                            safeTitle(
                                                    metadata.detectedTitle,
                                                    "Contenu SCORM"
                                            )
                                    )
                            )
                    )
            );
        }

        return new ScormQuickCreateAnalysisResponse(
                temporaryImportId,
                metadata.originalFileName,
                metadata.checksumSha256,
                metadata.scormVersion,
                metadata.detectedTitle,
                metadata.organizationTitle,
                metadata.itemCount,
                metadata.scoCount,
                metadata.structuredAvailable,
                Boolean.TRUE.equals(metadata.structuredAvailable)
                        ? ScormQuickCreateMode.STRUCTURED
                        : ScormQuickCreateMode.SAFE,
                preview,
                metadata.expiresAt
        );
    }

    private Path resolveStagingDirectory(String temporaryImportId) {
        try {
            String normalizedId = UUID.fromString(
                    temporaryImportId
            ).toString();

            Path directory = stagingRoot
                    .resolve(normalizedId)
                    .normalize();

            if (!directory.startsWith(stagingRoot)) {
                throw new IllegalArgumentException(
                        "Identifiant d'import SCORM temporaire invalide"
                );
            }

            return directory;
        } catch (Exception exception) {
            throw new IllegalArgumentException(
                    "Identifiant d'import SCORM temporaire invalide"
            );
        }
    }

    private void cleanupExpiredStaging() {
        try {
            Files.createDirectories(stagingRoot);

            long thresholdMillis = System.currentTimeMillis()
                    - (STALE_DIRECTORY_HOURS * 60L * 60L * 1000L);

            try (java.util.stream.Stream<Path> directories =
                         Files.list(stagingRoot)) {
                for (Path directory : directories
                        .filter(Files::isDirectory)
                        .toList()) {
                    try {
                        long modified = Files
                                .getLastModifiedTime(directory)
                                .toMillis();

                        if (modified < thresholdMillis) {
                            deleteRecursivelyQuietly(directory);
                        }
                    } catch (IOException ignored) {
                    }
                }
            }
        } catch (IOException ignored) {
        }
    }

    private void cleanupCreatedScormFiles(List<Long> lessonIds) {
        Path basePath = Paths.get(uploadProperties.getBaseDirectory())
                .toAbsolutePath()
                .normalize();

        for (Long lessonId : lessonIds) {
            if (lessonId == null) {
                continue;
            }

            Path lessonRoot = basePath
                    .resolve("scorm")
                    .resolve("lessons")
                    .resolve(String.valueOf(lessonId))
                    .normalize();

            if (lessonRoot.startsWith(basePath)) {
                deleteRecursivelyQuietly(lessonRoot);
            }
        }
    }

    private void deleteRecursively(Path root) throws IOException {
        if (root == null || !Files.exists(root)) {
            return;
        }

        try (java.util.stream.Stream<Path> paths = Files.walk(root)) {
            for (Path path : paths
                    .sorted(java.util.Comparator.reverseOrder())
                    .toList()) {
                Files.deleteIfExists(path);
            }
        }
    }

    private void deleteRecursivelyQuietly(Path root) {
        try {
            deleteRecursively(root);
        } catch (IOException ignored) {
        }
    }

    private String sha256(Path path) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            try (InputStream inputStream = Files.newInputStream(path)) {
                byte[] buffer = new byte[8192];
                int read;

                while ((read = inputStream.read(buffer)) >= 0) {
                    if (read > 0) {
                        digest.update(buffer, 0, read);
                    }
                }
            }

            StringBuilder hex = new StringBuilder();

            for (byte value : digest.digest()) {
                hex.append(String.format("%02x", value & 0xff));
            }

            return hex.toString();
        } catch (IOException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "Impossible de calculer le checksum SHA-256",
                    exception
            );
        }
    }

    private String cleanOriginalFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "package-scorm.zip";
        }

        return Paths.get(fileName)
                .getFileName()
                .toString()
                .replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String resolveDetectedTitle(
            String manifestTitle,
            String originalFileName
    ) {
        String normalized = normalizeOptional(manifestTitle);

        if (normalized != null) {
            return normalized;
        }

        String fileName = normalizeOptional(originalFileName);

        if (fileName == null) {
            return "Formation SCORM";
        }

        return fileName.replaceFirst("(?i)\\.zip$", "")
                .replace('_', ' ')
                .replace('-', ' ')
                .trim();
    }

    private String normalizeOptional(String value) {
        return value == null || value.trim().isEmpty()
                ? null
                : value.trim();
    }

    private String safeTitle(String value, String fallback) {
        String normalized = normalizeOptional(value);

        if (normalized != null) {
            return normalized.length() <= 150
                    ? normalized
                    : normalized.substring(0, 150);
        }

        String fallbackValue = normalizeOptional(fallback);

        if (fallbackValue == null) {
            fallbackValue = "Contenu SCORM";
        }

        return fallbackValue.length() <= 150
                ? fallbackValue
                : fallbackValue.substring(0, 150);
    }

    private String fileTitleFromHref(String href) {
        String clean = href == null
                ? ""
                : href.split("[?#]", 2)[0]
                        .replace("\\", "/");

        int slash = clean.lastIndexOf('/');
        String fileName = slash >= 0
                ? clean.substring(slash + 1)
                : clean;

        String withoutExtension = fileName.replaceFirst("\\.[^.]+$", "");

        return safeTitle(
                withoutExtension.replace('_', ' ').replace('-', ' '),
                "Contenu SCORM"
        );
    }

    private boolean isSafeRelativeLaunchHref(String href) {
        try {
            String clean = href.split("[?#]", 2)[0]
                    .replace("\\", "/")
                    .trim();

            if (clean.isEmpty()
                    || clean.startsWith("/")
                    || clean.matches("^[a-zA-Z][a-zA-Z0-9+.-]*:.*")) {
                return false;
            }

            Path relative = Paths.get(clean).normalize();

            return !relative.isAbsolute()
                    && !relative.startsWith("..");
        } catch (Exception exception) {
            return false;
        }
    }

    private void collectItemSubtree(
            Element item,
            List<Element> destination
    ) {
        destination.add(item);

        for (Element child : directChildren(item, "item")) {
            collectItemSubtree(child, destination);
        }
    }

    private List<Element> directChildren(
            Element parent,
            String localName
    ) {
        List<Element> result = new ArrayList<>();
        NodeList children = parent.getChildNodes();

        for (int index = 0; index < children.getLength(); index++) {
            Node node = children.item(index);

            if (node.getNodeType() == Node.ELEMENT_NODE) {
                Element element = (Element) node;

                if (localName.equalsIgnoreCase(elementName(element))) {
                    result.add(element);
                }
            }
        }

        return result;
    }

    private List<Element> descendants(
            Element root,
            String localName
    ) {
        List<Element> result = new ArrayList<>();
        NodeList all = root.getElementsByTagName("*");

        for (int index = 0; index < all.getLength(); index++) {
            Element element = (Element) all.item(index);

            if (localName.equalsIgnoreCase(elementName(element))) {
                result.add(element);
            }
        }

        return result;
    }

    private Element firstDescendant(
            Element root,
            String localName
    ) {
        List<Element> all = descendants(root, localName);
        return all.isEmpty() ? null : all.get(0);
    }

    private String textOfFirstDescendant(
            Element root,
            String localName
    ) {
        Element element = firstDescendant(root, localName);
        return element == null
                ? null
                : trimToNull(element.getTextContent());
    }

    private String directChildText(
            Element parent,
            String localName
    ) {
        List<Element> children = directChildren(parent, localName);

        if (children.isEmpty()) {
            return null;
        }

        return trimToNull(children.get(0).getTextContent());
    }

    private String elementName(Element element) {
        String localName = element.getLocalName();

        if (localName != null && !localName.isBlank()) {
            return localName;
        }

        String tagName = element.getTagName();
        int colon = tagName.indexOf(':');

        return colon >= 0
                ? tagName.substring(colon + 1)
                : tagName;
    }

    private String trimToNull(String value) {
        return value == null || value.trim().isEmpty()
                ? null
                : value.trim();
    }

    private static class ManifestInspection {
        public String scormVersion;
        public String detectedTitle;
        public String organizationTitle;
        public Integer itemCount;
        public Integer scoCount;
        public Boolean structuredAvailable;
        public List<StagedModule> modules = new ArrayList<>();
    }

    public static class StagedMetadata {
        public Long ownerId;
        public LocalDateTime createdAt;
        public LocalDateTime expiresAt;
        public String originalFileName;
        public String contentType;
        public String checksumSha256;
        public String scormVersion;
        public String detectedTitle;
        public String organizationTitle;
        public Integer itemCount;
        public Integer scoCount;
        public Boolean structuredAvailable;
        public List<StagedModule> modules = new ArrayList<>();

        public StagedMetadata() {
        }
    }

    public static class StagedModule {
        public String title;
        public List<StagedLesson> lessons = new ArrayList<>();

        public StagedModule() {
        }
    }

    public static class StagedLesson {
        public String title;
        public String launchHref;

        public StagedLesson() {
        }
    }
}
