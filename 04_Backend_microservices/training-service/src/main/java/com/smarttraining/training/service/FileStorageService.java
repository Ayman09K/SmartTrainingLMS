package com.smarttraining.training.service;

import com.smarttraining.training.config.UploadProperties;
import com.smarttraining.training.dto.FileUploadResponse;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private final UploadProperties uploadProperties;

    public FileStorageService(UploadProperties uploadProperties) {
        this.uploadProperties = uploadProperties;
    }

    public FileUploadResponse store(
            MultipartFile file,
            String folder,
            List<String> allowedMimeTypes,
            long maxSizeBytes
    ) {
        validateFile(file, allowedMimeTypes, maxSizeBytes);

        try {
            Path basePath = Paths.get(uploadProperties.getBaseDirectory())
                    .toAbsolutePath()
                    .normalize();

            Path targetDirectory = basePath.resolve(folder).normalize();

            if (!targetDirectory.startsWith(basePath)) {
                throw new IllegalArgumentException("Chemin de stockage invalide");
            }

            Files.createDirectories(targetDirectory);

            String originalFileName = cleanOriginalFileName(file.getOriginalFilename());
            String extension = extractExtension(originalFileName);
            String storedFileName = UUID.randomUUID() + extension;

            Path targetFile = targetDirectory.resolve(storedFileName).normalize();

            if (!targetFile.startsWith(targetDirectory)) {
                throw new IllegalArgumentException("Nom de fichier invalide");
            }

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }

            String relativePath = basePath.relativize(targetFile)
                    .toString()
                    .replace("\\", "/");

            String publicUrl = buildPublicUrl(relativePath);

            FileUploadResponse response = new FileUploadResponse();
            response.setOriginalFileName(originalFileName);
            response.setStoredFileName(storedFileName);
            response.setRelativePath(relativePath);
            response.setPublicUrl(publicUrl);
            response.setMimeType(file.getContentType());
            response.setFileSize(file.getSize());
            response.setMessage("Fichier importé avec succès");

            return response;
        } catch (IOException exception) {
            throw new IllegalArgumentException("Erreur lors du stockage du fichier : " + exception.getMessage());
        }
    }

    public FileUploadResponse storeBytes(
            byte[] content,
            String originalFileName,
            String contentType,
            String folder,
            List<String> allowedMimeTypes,
            long maxSizeBytes
    ) {
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException(
                    "Le fichier est obligatoire"
            );
        }

        if (content.length > maxSizeBytes) {
            throw new IllegalArgumentException(
                    "Le fichier depasse la taille maximale autorisee"
            );
        }

        if (contentType == null || contentType.isBlank()) {
            throw new IllegalArgumentException(
                    "Type de fichier non reconnu"
            );
        }

        if (!allowedMimeTypes.contains(contentType)) {
            throw new IllegalArgumentException(
                    "Type de fichier non autorise : " + contentType
            );
        }

        try {
            Path basePath = Paths.get(
                    uploadProperties.getBaseDirectory()
            )
                    .toAbsolutePath()
                    .normalize();

            Path targetDirectory =
                    basePath.resolve(folder).normalize();

            if (!targetDirectory.startsWith(basePath)) {
                throw new IllegalArgumentException(
                        "Chemin de stockage invalide"
                );
            }

            Files.createDirectories(targetDirectory);

            String cleanName =
                    cleanOriginalFileName(originalFileName);
            String extension = extractExtension(cleanName);
            String storedFileName =
                    UUID.randomUUID() + extension;

            Path targetFile =
                    targetDirectory
                            .resolve(storedFileName)
                            .normalize();

            if (!targetFile.startsWith(targetDirectory)) {
                throw new IllegalArgumentException(
                        "Nom de fichier invalide"
                );
            }

            Files.write(targetFile, content);

            String relativePath =
                    basePath
                            .relativize(targetFile)
                            .toString()
                            .replace("\\", "/");

            FileUploadResponse response =
                    new FileUploadResponse();

            response.setOriginalFileName(cleanName);
            response.setStoredFileName(storedFileName);
            response.setRelativePath(relativePath);
            response.setPublicUrl(
                    buildPublicUrl(relativePath)
            );
            response.setMimeType(contentType);
            response.setFileSize((long) content.length);
            response.setMessage(
                    "Fichier importe avec succes"
            );

            return response;
        } catch (IOException exception) {
            throw new IllegalArgumentException(
                    "Erreur lors du stockage du fichier : "
                            + exception.getMessage()
            );
        }
    }
    private void validateFile(MultipartFile file, List<String> allowedMimeTypes, long maxSizeBytes) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est obligatoire");
        }

        if (file.getSize() > maxSizeBytes) {
            throw new IllegalArgumentException("Le fichier dépasse la taille maximale autorisée");
        }

        String contentType = file.getContentType();

        if (contentType == null || contentType.isBlank()) {
            throw new IllegalArgumentException("Type de fichier non reconnu");
        }

        if (!allowedMimeTypes.contains(contentType)) {
            throw new IllegalArgumentException("Type de fichier non autorisé : " + contentType);
        }
    }

    private String cleanOriginalFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "fichier";
        }

        return Paths.get(fileName)
                .getFileName()
                .toString()
                .replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String extractExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf(".");

        if (dotIndex < 0) {
            return "";
        }

        return fileName.substring(dotIndex).toLowerCase();
    }

    private String buildPublicUrl(String relativePath) {
        String baseUrl = uploadProperties.getPublicBaseUrl();

        if (baseUrl.endsWith("/")) {
            return baseUrl + relativePath;
        }

        return baseUrl + "/" + relativePath;
    }
}
