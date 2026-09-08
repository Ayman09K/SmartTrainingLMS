package com.smarttraining.training.dto;

import com.smarttraining.training.entity.PedagogicalResource;
import com.smarttraining.training.enums.ResourceType;
import com.smarttraining.training.enums.StorageMode;
import java.time.LocalDateTime;

public class ResourceResponse {

    private Long id;
    private Long lessonId;
    private String title;
    private String description;
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
    private LocalDateTime uploadedAt;
    private Long scormPackageId;
    private String scormLaunchPath;
    private String scormManifestPath;
    private Boolean active;
    private Integer orderIndex;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ResourceResponse() {
    }

    public ResourceResponse(PedagogicalResource resource) {
        this.id = resource.getId();
        this.lessonId = resource.getLesson().getId();
        this.title = resource.getTitle();
        this.description = resource.getDescription();
        this.type = resource.getType();
        this.storageMode = resource.getStorageMode();
        this.url = resource.getUrl();
        this.textContent = resource.getTextContent();
        this.originalFileName = resource.getOriginalFileName();
        this.storedFileName = resource.getStoredFileName();
        this.relativePath = resource.getRelativePath();
        this.publicUrl = resource.getPublicUrl();
        this.mimeType = resource.getMimeType();
        this.fileSize = resource.getFileSize();
        this.durationSeconds = resource.getDurationSeconds();
        this.uploadedBy = resource.getUploadedBy();
        this.uploadedAt = resource.getUploadedAt();
        this.scormPackageId = resource.getScormPackageId();
        this.scormLaunchPath = resource.getScormLaunchPath();
        this.scormManifestPath = resource.getScormManifestPath();
        this.active = resource.getActive();
        this.orderIndex = resource.getOrderIndex();
        this.createdAt = resource.getCreatedAt();
        this.updatedAt = resource.getUpdatedAt();
    }

    public Long getId() { return id; }
    public Long getLessonId() { return lessonId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public ResourceType getType() { return type; }
    public StorageMode getStorageMode() { return storageMode; }
    public String getUrl() { return url; }
    public String getTextContent() { return textContent; }
    public String getOriginalFileName() { return originalFileName; }
    public String getStoredFileName() { return storedFileName; }
    public String getRelativePath() { return relativePath; }
    public String getPublicUrl() { return publicUrl; }
    public String getMimeType() { return mimeType; }
    public Long getFileSize() { return fileSize; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public Long getUploadedBy() { return uploadedBy; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public Long getScormPackageId() { return scormPackageId; }
    public String getScormLaunchPath() { return scormLaunchPath; }
    public String getScormManifestPath() { return scormManifestPath; }
    public Boolean getActive() { return active; }
    public Integer getOrderIndex() { return orderIndex; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
