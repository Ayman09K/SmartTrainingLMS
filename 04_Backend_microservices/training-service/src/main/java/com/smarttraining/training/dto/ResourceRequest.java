package com.smarttraining.training.dto;

import com.smarttraining.training.enums.ResourceType;
import com.smarttraining.training.enums.StorageMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class ResourceRequest {

    @NotNull(message = "L'identifiant de la leçon est obligatoire")
    private Long lessonId;

    @NotBlank(message = "Le titre de la ressource est obligatoire")
    private String title;

    private String description;

    @NotNull(message = "Le type de ressource est obligatoire")
    private ResourceType type;

    private StorageMode storageMode;

    private String url;
    private String textContent;

    private String originalFileName;
    private String storedFileName;
    private String relativePath;
    private String publicUrl;
    private String mimeType;
    private Long fileSize;
    private Integer durationSeconds;
    private Long uploadedBy;

    private Long scormPackageId;
    private String scormLaunchPath;
    private String scormManifestPath;

    private Boolean active;

    @NotNull(message = "L'ordre de la ressource est obligatoire")
    @Positive(message = "L'ordre de la ressource doit être supérieur à zéro")
    private Integer orderIndex;

    public ResourceRequest() {
    }

    public Long getLessonId() { return lessonId; }
    public void setLessonId(Long lessonId) { this.lessonId = lessonId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public ResourceType getType() { return type; }
    public void setType(ResourceType type) { this.type = type; }

    public StorageMode getStorageMode() { return storageMode; }
    public void setStorageMode(StorageMode storageMode) { this.storageMode = storageMode; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getTextContent() { return textContent; }
    public void setTextContent(String textContent) { this.textContent = textContent; }

    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { this.originalFileName = originalFileName; }

    public String getStoredFileName() { return storedFileName; }
    public void setStoredFileName(String storedFileName) { this.storedFileName = storedFileName; }

    public String getRelativePath() { return relativePath; }
    public void setRelativePath(String relativePath) { this.relativePath = relativePath; }

    public String getPublicUrl() { return publicUrl; }
    public void setPublicUrl(String publicUrl) { this.publicUrl = publicUrl; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }

    public Long getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(Long uploadedBy) { this.uploadedBy = uploadedBy; }

    public Long getScormPackageId() { return scormPackageId; }
    public void setScormPackageId(Long scormPackageId) { this.scormPackageId = scormPackageId; }

    public String getScormLaunchPath() { return scormLaunchPath; }
    public void setScormLaunchPath(String scormLaunchPath) { this.scormLaunchPath = scormLaunchPath; }

    public String getScormManifestPath() { return scormManifestPath; }
    public void setScormManifestPath(String scormManifestPath) { this.scormManifestPath = scormManifestPath; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
}
