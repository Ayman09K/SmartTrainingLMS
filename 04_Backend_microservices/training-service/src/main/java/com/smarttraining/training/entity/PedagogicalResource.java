package com.smarttraining.training.entity;

import com.smarttraining.training.enums.ResourceType;
import com.smarttraining.training.enums.StorageMode;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pedagogical_resources")
public class PedagogicalResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ResourceType type;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private StorageMode storageMode;

    @Column(length = 1500)
    private String url;

    @Column(length = 5000)
    private String textContent;

    @Column(length = 255)
    private String originalFileName;

    @Column(length = 255)
    private String storedFileName;

    @Column(length = 1500)
    private String relativePath;

    @Column(length = 1500)
    private String publicUrl;

    @Column(length = 150)
    private String mimeType;

    private Long fileSize;

    private Integer durationSeconds;

    private Long uploadedBy;

    private LocalDateTime uploadedAt;

    private Long scormPackageId;

    @Column(length = 1500)
    private String scormLaunchPath;

    @Column(length = 1500)
    private String scormManifestPath;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false)
    private Integer orderIndex;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    public PedagogicalResource() {
    }

    public PedagogicalResource(String title, ResourceType type, String url,
                               String textContent, Integer orderIndex, Lesson lesson) {
        this.title = title;
        this.type = type;
        this.url = url;
        this.textContent = textContent;
        this.orderIndex = orderIndex;
        this.lesson = lesson;
    }

    @PrePersist
    public void beforeCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (active == null) {
            active = true;
        }

        if (storageMode == null) {
            storageMode = guessStorageMode();
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        updatedAt = LocalDateTime.now();

        if (storageMode == null) {
            storageMode = guessStorageMode();
        }

        if (active == null) {
            active = true;
        }
    }

    private StorageMode guessStorageMode() {
        if (type == ResourceType.TEXT) {
            return StorageMode.TEXT_CONTENT;
        }

        if (type == ResourceType.SCORM) {
            return StorageMode.SCORM_PACKAGE;
        }

        if (relativePath != null && !relativePath.isBlank()) {
            return StorageMode.LOCAL_FILE;
        }

        if (url != null && !url.isBlank()) {
            return StorageMode.EXTERNAL_URL;
        }

        return StorageMode.TEXT_CONTENT;
    }

    public Long getId() { return id; }

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

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public Lesson getLesson() { return lesson; }
    public void setLesson(Lesson lesson) { this.lesson = lesson; }
}
