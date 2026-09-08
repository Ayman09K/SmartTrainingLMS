package com.smarttraining.training.dto;

import com.smarttraining.training.entity.ScormPackage;
import java.time.LocalDateTime;

public class ScormUploadResponse {

    private Long scormPackageId;
    private Long lessonId;
    private Long resourceId;

    private String title;
    private String originalFileName;
    private String storedFileName;

    private String zipRelativePath;
    private String extractRelativePath;
    private String manifestRelativePath;
    private String launchRelativePath;
    private String launchPublicUrl;

    private String scormVersion;
    private Long fileSize;
    private Long uploadedBy;
    private LocalDateTime uploadedAt;

    private String message;

    public ScormUploadResponse() {
    }

    public ScormUploadResponse(ScormPackage scormPackage, Long resourceId, String message) {
        this.scormPackageId = scormPackage.getId();
        this.lessonId = scormPackage.getLesson().getId();
        this.resourceId = resourceId;
        this.title = scormPackage.getTitle();
        this.originalFileName = scormPackage.getOriginalFileName();
        this.storedFileName = scormPackage.getStoredFileName();
        this.zipRelativePath = scormPackage.getZipRelativePath();
        this.extractRelativePath = scormPackage.getExtractRelativePath();
        this.manifestRelativePath = scormPackage.getManifestRelativePath();
        this.launchRelativePath = scormPackage.getLaunchRelativePath();
        this.launchPublicUrl = scormPackage.getLaunchPublicUrl();
        this.scormVersion = scormPackage.getScormVersion();
        this.fileSize = scormPackage.getFileSize();
        this.uploadedBy = scormPackage.getUploadedBy();
        this.uploadedAt = scormPackage.getUploadedAt();
        this.message = message;
    }

    public Long getScormPackageId() {
        return scormPackageId;
    }

    public Long getLessonId() {
        return lessonId;
    }

    public Long getResourceId() {
        return resourceId;
    }

    public String getTitle() {
        return title;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public String getStoredFileName() {
        return storedFileName;
    }

    public String getZipRelativePath() {
        return zipRelativePath;
    }

    public String getExtractRelativePath() {
        return extractRelativePath;
    }

    public String getManifestRelativePath() {
        return manifestRelativePath;
    }

    public String getLaunchRelativePath() {
        return launchRelativePath;
    }

    public String getLaunchPublicUrl() {
        return launchPublicUrl;
    }

    public String getScormVersion() {
        return scormVersion;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public Long getUploadedBy() {
        return uploadedBy;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public String getMessage() {
        return message;
    }
}
