package com.smarttraining.training.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "scorm_packages")
public class ScormPackage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 150)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(length = 80)
    private String scormVersion;

    @Column(length = 255)
    private String originalFileName;

    @Column(length = 255)
    private String storedFileName;

    @Column(length = 1500)
    private String zipRelativePath;

    @Column(length = 1500)
    private String extractRelativePath;

    @Column(length = 1500)
    private String manifestRelativePath;

    @Column(length = 1500)
    private String launchRelativePath;

    @Column(length = 1500)
    private String launchPublicUrl;

    private Long fileSize;

    private Long uploadedBy;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    public ScormPackage() {
    }

    @PrePersist
    public void beforeCreate() {
        if (uploadedAt == null) {
            uploadedAt = LocalDateTime.now();
        }

        if (active == null) {
            active = true;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        if (active == null) {
            active = true;
        }
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getScormVersion() {
        return scormVersion;
    }

    public void setScormVersion(String scormVersion) {
        this.scormVersion = scormVersion;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getStoredFileName() {
        return storedFileName;
    }

    public void setStoredFileName(String storedFileName) {
        this.storedFileName = storedFileName;
    }

    public String getZipRelativePath() {
        return zipRelativePath;
    }

    public void setZipRelativePath(String zipRelativePath) {
        this.zipRelativePath = zipRelativePath;
    }

    public String getExtractRelativePath() {
        return extractRelativePath;
    }

    public void setExtractRelativePath(String extractRelativePath) {
        this.extractRelativePath = extractRelativePath;
    }

    public String getManifestRelativePath() {
        return manifestRelativePath;
    }

    public void setManifestRelativePath(String manifestRelativePath) {
        this.manifestRelativePath = manifestRelativePath;
    }

    public String getLaunchRelativePath() {
        return launchRelativePath;
    }

    public void setLaunchRelativePath(String launchRelativePath) {
        this.launchRelativePath = launchRelativePath;
    }

    public String getLaunchPublicUrl() {
        return launchPublicUrl;
    }

    public void setLaunchPublicUrl(String launchPublicUrl) {
        this.launchPublicUrl = launchPublicUrl;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public Long getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(Long uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public Lesson getLesson() {
        return lesson;
    }

    public void setLesson(Lesson lesson) {
        this.lesson = lesson;
    }
}
