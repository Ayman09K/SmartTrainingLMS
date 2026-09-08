package com.smarttraining.training.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "smarttraining.upload")
public class UploadProperties {

    private String baseDirectory;
    private String publicBaseUrl;

    private long maxImageSizeBytes;
    private long maxPdfSizeBytes;
    private long maxDocumentSizeBytes;
    private long maxVideoSizeBytes;
    private long maxScormSizeBytes;

    private List<String> allowedImageTypes = new ArrayList<>();
    private List<String> allowedPdfTypes = new ArrayList<>();
    private List<String> allowedDocumentTypes = new ArrayList<>();
    private List<String> allowedVideoTypes = new ArrayList<>();
    private List<String> allowedScormTypes = new ArrayList<>();

    public String getBaseDirectory() {
        return baseDirectory;
    }

    public void setBaseDirectory(String baseDirectory) {
        this.baseDirectory = baseDirectory;
    }

    public String getPublicBaseUrl() {
        return publicBaseUrl;
    }

    public void setPublicBaseUrl(String publicBaseUrl) {
        this.publicBaseUrl = publicBaseUrl;
    }

    public long getMaxImageSizeBytes() {
        return maxImageSizeBytes;
    }

    public void setMaxImageSizeBytes(long maxImageSizeBytes) {
        this.maxImageSizeBytes = maxImageSizeBytes;
    }

    public long getMaxPdfSizeBytes() {
        return maxPdfSizeBytes;
    }

    public void setMaxPdfSizeBytes(long maxPdfSizeBytes) {
        this.maxPdfSizeBytes = maxPdfSizeBytes;
    }

    public long getMaxDocumentSizeBytes() {
        return maxDocumentSizeBytes;
    }

    public void setMaxDocumentSizeBytes(long maxDocumentSizeBytes) {
        this.maxDocumentSizeBytes = maxDocumentSizeBytes;
    }

    public long getMaxVideoSizeBytes() {
        return maxVideoSizeBytes;
    }

    public void setMaxVideoSizeBytes(long maxVideoSizeBytes) {
        this.maxVideoSizeBytes = maxVideoSizeBytes;
    }

    public long getMaxScormSizeBytes() {
        return maxScormSizeBytes;
    }

    public void setMaxScormSizeBytes(long maxScormSizeBytes) {
        this.maxScormSizeBytes = maxScormSizeBytes;
    }

    public List<String> getAllowedImageTypes() {
        return allowedImageTypes;
    }

    public void setAllowedImageTypes(List<String> allowedImageTypes) {
        this.allowedImageTypes = allowedImageTypes;
    }

    public List<String> getAllowedPdfTypes() {
        return allowedPdfTypes;
    }

    public void setAllowedPdfTypes(List<String> allowedPdfTypes) {
        this.allowedPdfTypes = allowedPdfTypes;
    }

    public List<String> getAllowedDocumentTypes() {
        return allowedDocumentTypes;
    }

    public void setAllowedDocumentTypes(List<String> allowedDocumentTypes) {
        this.allowedDocumentTypes = allowedDocumentTypes;
    }

    public List<String> getAllowedVideoTypes() {
        return allowedVideoTypes;
    }

    public void setAllowedVideoTypes(List<String> allowedVideoTypes) {
        this.allowedVideoTypes = allowedVideoTypes;
    }

    public List<String> getAllowedScormTypes() {
        return allowedScormTypes;
    }

    public void setAllowedScormTypes(List<String> allowedScormTypes) {
        this.allowedScormTypes = allowedScormTypes;
    }
}
