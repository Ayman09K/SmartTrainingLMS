package com.smarttraining.training.service;

import com.smarttraining.training.config.UploadProperties;
import com.smarttraining.training.dto.ScormUploadResponse;
import com.smarttraining.training.entity.Lesson;
import com.smarttraining.training.entity.PedagogicalResource;
import com.smarttraining.training.entity.ScormPackage;
import com.smarttraining.training.enums.ResourceType;
import com.smarttraining.training.enums.StorageMode;
import com.smarttraining.training.repository.LessonRepository;
import com.smarttraining.training.repository.PedagogicalResourceRepository;
import com.smarttraining.training.repository.ScormPackageRepository;
import com.smarttraining.training.security.TrainingOwnershipService;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

@Service
@Transactional
public class ScormImportService {

    private static final int MAX_ZIP_ENTRIES = 5000;

    private final UploadProperties uploadProperties;
    private final LessonRepository lessonRepository;
    private final PedagogicalResourceRepository resourceRepository;
    private final ScormPackageRepository scormPackageRepository;
    private final TrainingOwnershipService ownershipService;
    private final TrainingVersionService versionService;

    public ScormImportService(
            UploadProperties uploadProperties,
            LessonRepository lessonRepository,
            PedagogicalResourceRepository resourceRepository,
            ScormPackageRepository scormPackageRepository,
            TrainingOwnershipService ownershipService,
            TrainingVersionService versionService
    ) {
        this.uploadProperties = uploadProperties;
        this.lessonRepository = lessonRepository;
        this.resourceRepository = resourceRepository;
        this.scormPackageRepository = scormPackageRepository;
        this.ownershipService = ownershipService;
        this.versionService = versionService;
    }

    public ScormUploadResponse importScormPackage(
            Long lessonId,
            MultipartFile file,
            String title,
            String description,
            Long uploadedBy,
            Integer orderIndex
    ) {
        validateScormZip(file);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Leçon introuvable"));

        // Contrôle avant toute écriture de ZIP ou extraction sur disque.
        ownershipService.assertCanManageLesson(lesson);
        versionService.requireEditable(lesson);
        Long actorId = ownershipService.getActorId();

        try {
            Path basePath = Paths.get(uploadProperties.getBaseDirectory())
                    .toAbsolutePath()
                    .normalize();

            String importId = UUID.randomUUID().toString();

            Path packageRoot = basePath.resolve("scorm")
                    .resolve("lessons")
                    .resolve(String.valueOf(lessonId))
                    .resolve(importId)
                    .normalize();

            Path contentDirectory = packageRoot.resolve("content").normalize();
            Path zipDirectory = packageRoot.resolve("zip").normalize();

            if (!packageRoot.startsWith(basePath)
                    || !contentDirectory.startsWith(basePath)
                    || !zipDirectory.startsWith(basePath)) {
                throw new IllegalArgumentException("Chemin SCORM invalide");
            }

            Files.createDirectories(contentDirectory);
            Files.createDirectories(zipDirectory);

            String originalFileName = cleanOriginalFileName(file.getOriginalFilename());
            String storedFileName = importId + ".zip";
            Path storedZipPath = zipDirectory.resolve(storedFileName).normalize();

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, storedZipPath, StandardCopyOption.REPLACE_EXISTING);
            }

            extractZipSafely(storedZipPath, contentDirectory);

            Path manifestPath = findRequiredFile(contentDirectory, "imsmanifest.xml");

            Path launchPath = findLaunchFile(contentDirectory, manifestPath);

            String zipRelativePath = toRelativePath(basePath, storedZipPath);
            String extractRelativePath = toRelativePath(basePath, contentDirectory);
            String manifestRelativePath = toRelativePath(basePath, manifestPath);
            String launchRelativePath = toRelativePath(basePath, launchPath);
            String launchPublicUrl = buildPublicUrl(launchRelativePath);

            ScormPackage scormPackage = new ScormPackage();
            scormPackage.setLesson(lesson);
            scormPackage.setTitle(resolveTitle(title, originalFileName));
            scormPackage.setDescription(description);
            scormPackage.setScormVersion("SCORM_MANIFEST_DETECTED");
            scormPackage.setOriginalFileName(originalFileName);
            scormPackage.setStoredFileName(storedFileName);
            scormPackage.setZipRelativePath(zipRelativePath);
            scormPackage.setExtractRelativePath(extractRelativePath);
            scormPackage.setManifestRelativePath(manifestRelativePath);
            scormPackage.setLaunchRelativePath(launchRelativePath);
            scormPackage.setLaunchPublicUrl(launchPublicUrl);
            scormPackage.setFileSize(file.getSize());
            scormPackage.setUploadedBy(actorId);
            scormPackage.setActive(true);

            ScormPackage savedPackage = scormPackageRepository.save(scormPackage);

            PedagogicalResource resource = new PedagogicalResource();
            resource.setLesson(lesson);
            resource.setTitle(savedPackage.getTitle());
            resource.setDescription(description);
            resource.setType(ResourceType.SCORM);
            resource.setStorageMode(StorageMode.SCORM_PACKAGE);
            resource.setUrl(launchPublicUrl);
            resource.setPublicUrl(launchPublicUrl);
            resource.setRelativePath(extractRelativePath);
            resource.setOriginalFileName(originalFileName);
            resource.setStoredFileName(storedFileName);
            resource.setMimeType(file.getContentType());
            resource.setFileSize(file.getSize());
            resource.setUploadedBy(actorId);
            resource.setUploadedAt(LocalDateTime.now());
            resource.setScormPackageId(savedPackage.getId());
            resource.setScormLaunchPath(launchRelativePath);
            resource.setScormManifestPath(manifestRelativePath);
            resource.setActive(true);
            resource.setOrderIndex(resolveOrderIndex(lessonId, orderIndex));

            PedagogicalResource savedResource = resourceRepository.save(resource);

            return new ScormUploadResponse(
                    savedPackage,
                    savedResource.getId(),
                    "Package SCORM importé et ressource pédagogique créée"
            );
        } catch (IOException exception) {
            throw new IllegalArgumentException("Erreur import SCORM : " + exception.getMessage());
        }
    }


    public ScormUploadResponse importStagedScormPackage(
            Long lessonId,
            Path stagedZipPath,
            String originalFileName,
            String contentType,
            String title,
            String description,
            Integer orderIndex,
            String launchHrefOverride
    ) {
        if (stagedZipPath == null || !Files.isRegularFile(stagedZipPath)) {
            throw new IllegalArgumentException("Package SCORM temporaire introuvable");
        }

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Leçon introuvable"));

        ownershipService.assertCanManageLesson(lesson);
        versionService.requireEditable(lesson);
        Long actorId = ownershipService.getActorId();

        Path packageRoot = null;

        try {
            long stagedSize = Files.size(stagedZipPath);

            if (stagedSize <= 0L
                    || stagedSize > uploadProperties.getMaxScormSizeBytes()) {
                throw new IllegalArgumentException(
                        "Le package SCORM dépasse la taille maximale autorisée"
                );
            }

            Path basePath = Paths.get(uploadProperties.getBaseDirectory())
                    .toAbsolutePath()
                    .normalize();

            String importId = UUID.randomUUID().toString();

            packageRoot = basePath.resolve("scorm")
                    .resolve("lessons")
                    .resolve(String.valueOf(lessonId))
                    .resolve(importId)
                    .normalize();

            Path contentDirectory = packageRoot.resolve("content").normalize();
            Path zipDirectory = packageRoot.resolve("zip").normalize();

            if (!packageRoot.startsWith(basePath)
                    || !contentDirectory.startsWith(basePath)
                    || !zipDirectory.startsWith(basePath)) {
                throw new IllegalArgumentException("Chemin SCORM invalide");
            }

            Files.createDirectories(contentDirectory);
            Files.createDirectories(zipDirectory);

            String cleanFileName = cleanOriginalFileName(originalFileName);
            String storedFileName = importId + ".zip";
            Path storedZipPath = zipDirectory.resolve(storedFileName).normalize();

            Files.copy(
                    stagedZipPath,
                    storedZipPath,
                    StandardCopyOption.REPLACE_EXISTING
            );

            extractZipSafely(storedZipPath, contentDirectory);

            Path manifestPath = findRequiredFile(
                    contentDirectory,
                    "imsmanifest.xml"
            );

            Path launchPath = resolveStagedLaunchFile(
                    contentDirectory,
                    manifestPath,
                    launchHrefOverride
            );

            String zipRelativePath = toRelativePath(basePath, storedZipPath);
            String extractRelativePath = toRelativePath(basePath, contentDirectory);
            String manifestRelativePath = toRelativePath(basePath, manifestPath);
            String launchRelativePath = toRelativePath(basePath, launchPath);
            String launchPublicUrl = buildPublicUrl(launchRelativePath);

            ScormPackage scormPackage = new ScormPackage();
            scormPackage.setLesson(lesson);
            scormPackage.setTitle(resolveTitle(title, cleanFileName));
            scormPackage.setDescription(description);
            scormPackage.setScormVersion("SCORM_MANIFEST_DETECTED");
            scormPackage.setOriginalFileName(cleanFileName);
            scormPackage.setStoredFileName(storedFileName);
            scormPackage.setZipRelativePath(zipRelativePath);
            scormPackage.setExtractRelativePath(extractRelativePath);
            scormPackage.setManifestRelativePath(manifestRelativePath);
            scormPackage.setLaunchRelativePath(launchRelativePath);
            scormPackage.setLaunchPublicUrl(launchPublicUrl);
            scormPackage.setFileSize(stagedSize);
            scormPackage.setUploadedBy(actorId);
            scormPackage.setActive(true);

            ScormPackage savedPackage =
                    scormPackageRepository.save(scormPackage);

            PedagogicalResource resource = new PedagogicalResource();
            resource.setLesson(lesson);
            resource.setTitle(savedPackage.getTitle());
            resource.setDescription(description);
            resource.setType(ResourceType.SCORM);
            resource.setStorageMode(StorageMode.SCORM_PACKAGE);
            resource.setUrl(launchPublicUrl);
            resource.setPublicUrl(launchPublicUrl);
            resource.setRelativePath(extractRelativePath);
            resource.setOriginalFileName(cleanFileName);
            resource.setStoredFileName(storedFileName);
            resource.setMimeType(contentType);
            resource.setFileSize(stagedSize);
            resource.setUploadedBy(actorId);
            resource.setUploadedAt(LocalDateTime.now());
            resource.setScormPackageId(savedPackage.getId());
            resource.setScormLaunchPath(launchRelativePath);
            resource.setScormManifestPath(manifestRelativePath);
            resource.setActive(true);
            resource.setOrderIndex(resolveOrderIndex(lessonId, orderIndex));

            PedagogicalResource savedResource =
                    resourceRepository.save(resource);

            return new ScormUploadResponse(
                    savedPackage,
                    savedResource.getId(),
                    "Package SCORM importe depuis le staging Quick Create"
            );
        } catch (Exception exception) {
            deleteRecursivelyQuietly(packageRoot);

            if (exception instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }

            throw new IllegalArgumentException(
                    "Erreur import SCORM Quick Create : " + exception.getMessage(),
                    exception
            );
        }
    }

    private Path resolveStagedLaunchFile(
            Path contentDirectory,
            Path manifestPath,
            String launchHrefOverride
    ) throws IOException {
        if (launchHrefOverride == null || launchHrefOverride.isBlank()) {
            return findLaunchFile(contentDirectory, manifestPath);
        }

        String cleanHref = launchHrefOverride
                .split("[?#]", 2)[0]
                .replace("\\", "/")
                .trim();

        if (cleanHref.isEmpty()
                || cleanHref.startsWith("/")
                || cleanHref.matches("^[a-zA-Z][a-zA-Z0-9+.-]*:.*")) {
            throw new IllegalArgumentException(
                    "Chemin de lancement SCORM structuré invalide"
            );
        }

        Path relativePath = Paths.get(cleanHref).normalize();

        if (relativePath.isAbsolute() || relativePath.startsWith("..")) {
            throw new IllegalArgumentException(
                    "Chemin de lancement SCORM structuré invalide"
            );
        }

        Path fromManifest = manifestPath.getParent()
                .resolve(relativePath)
                .normalize();

        if (fromManifest.startsWith(contentDirectory)
                && Files.isRegularFile(fromManifest)) {
            return fromManifest;
        }

        Path fromRoot = contentDirectory
                .resolve(relativePath)
                .normalize();

        if (fromRoot.startsWith(contentDirectory)
                && Files.isRegularFile(fromRoot)) {
            return fromRoot;
        }

        throw new IllegalArgumentException(
                "Fichier de lancement SCORM structuré introuvable"
        );
    }

    private void deleteRecursivelyQuietly(Path root) {
        if (root == null || !Files.exists(root)) {
            return;
        }

        try (java.util.stream.Stream<Path> paths = Files.walk(root)) {
            for (Path path : paths
                    .sorted(java.util.Comparator.reverseOrder())
                    .toList()) {
                Files.deleteIfExists(path);
            }
        } catch (IOException ignored) {
        }
    }

    public ScormUploadResponse getScormPackage(Long scormPackageId) {
        ScormPackage scormPackage = scormPackageRepository.findById(scormPackageId)
                .orElseThrow(() -> new IllegalArgumentException("Package SCORM introuvable"));

        return new ScormUploadResponse(scormPackage, null, "Package SCORM trouvé");
    }

    void validateScormZip(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier SCORM est obligatoire");
        }

        if (file.getSize() > uploadProperties.getMaxScormSizeBytes()) {
            throw new IllegalArgumentException("Le package SCORM dépasse la taille maximale autorisée");
        }

        String originalFileName = file.getOriginalFilename();

        if (originalFileName == null || !originalFileName.toLowerCase(Locale.ROOT).endsWith(".zip")) {
            throw new IllegalArgumentException("Le package SCORM doit être un fichier ZIP");
        }

        String contentType = file.getContentType();

        if (contentType != null
                && !contentType.isBlank()
                && !uploadProperties.getAllowedScormTypes().contains(contentType)) {
            throw new IllegalArgumentException("Type de fichier SCORM non autorisé : " + contentType);
        }
    }

    void extractZipSafely(Path zipPath, Path destinationDirectory) throws IOException {
        int entryCount = 0;
        long extractedBytes = 0;
        long maxExtractedBytes = uploadProperties.getMaxScormSizeBytes() * 3;

        try (ZipInputStream zipInputStream = new ZipInputStream(Files.newInputStream(zipPath))) {
            ZipEntry entry;

            while ((entry = zipInputStream.getNextEntry()) != null) {
                entryCount++;

                if (entryCount > MAX_ZIP_ENTRIES) {
                    throw new IllegalArgumentException("Le package SCORM contient trop de fichiers");
                }

                Path targetPath = destinationDirectory.resolve(entry.getName()).normalize();

                if (!targetPath.startsWith(destinationDirectory)) {
                    throw new IllegalArgumentException("Package SCORM dangereux : chemin invalide détecté");
                }

                if (entry.isDirectory()) {
                    Files.createDirectories(targetPath);
                } else {
                    if (targetPath.getParent() != null) {
                        Files.createDirectories(targetPath.getParent());
                    }

                    long written = Files.copy(zipInputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
                    extractedBytes += written;

                    if (extractedBytes > maxExtractedBytes) {
                        throw new IllegalArgumentException("Le package SCORM extrait dépasse la limite autorisée");
                    }
                }

                zipInputStream.closeEntry();
            }
        }
    }

    Path findRequiredFile(Path rootDirectory, String fileName) throws IOException {
        try (java.util.stream.Stream<Path> files = Files.walk(rootDirectory)) {
            return files
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().equalsIgnoreCase(fileName))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Fichier " + fileName + " introuvable dans le package SCORM"));
        }
    }

    Path findLaunchFile(Path contentDirectory, Path manifestPath) throws IOException {
        String href = extractLaunchHrefFromManifest(manifestPath);

        if (href != null && !href.isBlank()) {
            Path launchPath = manifestPath.getParent().resolve(href).normalize();

            if (Files.exists(launchPath) && launchPath.startsWith(contentDirectory)) {
                return launchPath;
            }

            Path launchFromRoot = contentDirectory.resolve(href).normalize();

            if (Files.exists(launchFromRoot) && launchFromRoot.startsWith(contentDirectory)) {
                return launchFromRoot;
            }
        }

        String[] commonLaunchFiles = {
                "index.html",
                "index.htm",
                "story.html",
                "story_html5.html",
                "index_lms.html",
                "launch.html",
                "player.html"
        };

        for (String launchFile : commonLaunchFiles) {
            try (java.util.stream.Stream<Path> files = Files.walk(contentDirectory)) {
                java.util.Optional<Path> found = files
                        .filter(Files::isRegularFile)
                        .filter(path -> path.getFileName().toString().equalsIgnoreCase(launchFile))
                        .findFirst();

                if (found.isPresent()) {
                    return found.get();
                }
            }
        }

        throw new IllegalArgumentException("Fichier de lancement SCORM introuvable");
    }

    private String extractLaunchHrefFromManifest(Path manifestPath) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(false);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);

            DocumentBuilder builder = factory.newDocumentBuilder();
            Document document = builder.parse(manifestPath.toFile());

            NodeList resources = document.getElementsByTagName("resource");

            for (int index = 0; index < resources.getLength(); index++) {
                org.w3c.dom.Element resource = (org.w3c.dom.Element) resources.item(index);
                String href = resource.getAttribute("href");

                if (href != null && !href.isBlank()) {
                    return href;
                }
            }

            return null;
        } catch (Exception exception) {
            return null;
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

    private String resolveTitle(String title, String originalFileName) {
        if (title != null && !title.isBlank()) {
            return title;
        }

        return originalFileName == null || originalFileName.isBlank()
                ? "Package SCORM"
                : originalFileName;
    }

    private Integer resolveOrderIndex(Long lessonId, Integer orderIndex) {
        if (orderIndex != null && orderIndex > 0) {
            return orderIndex;
        }

        return (int) resourceRepository.countByLessonId(lessonId) + 1;
    }

    private String toRelativePath(Path basePath, Path filePath) {
        return basePath.relativize(filePath)
                .toString()
                .replace("\\", "/");
    }

    private String buildPublicUrl(String relativePath) {
        String baseUrl = uploadProperties.getPublicBaseUrl();

        if (baseUrl.endsWith("/")) {
            return baseUrl + relativePath;
        }

        return baseUrl + "/" + relativePath;
    }
}
