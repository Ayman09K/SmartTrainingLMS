package com.smarttraining.training.dto;

import com.smarttraining.training.enums.ScormQuickCreateMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ScormQuickCreateAnalysisResponse {

    private String temporaryImportId;
    private String originalFileName;
    private String checksumSha256;
    private String scormVersion;
    private String detectedTitle;
    private String organizationTitle;
    private Integer itemCount;
    private Integer scoCount;
    private Boolean structuredAvailable;
    private ScormQuickCreateMode proposedMode;
    private List<ScormQuickCreatePreviewModule> preview = new ArrayList<>();
    private LocalDateTime expiresAt;

    public ScormQuickCreateAnalysisResponse() {
    }

    public ScormQuickCreateAnalysisResponse(
            String temporaryImportId,
            String originalFileName,
            String checksumSha256,
            String scormVersion,
            String detectedTitle,
            String organizationTitle,
            Integer itemCount,
            Integer scoCount,
            Boolean structuredAvailable,
            ScormQuickCreateMode proposedMode,
            List<ScormQuickCreatePreviewModule> preview,
            LocalDateTime expiresAt
    ) {
        this.temporaryImportId = temporaryImportId;
        this.originalFileName = originalFileName;
        this.checksumSha256 = checksumSha256;
        this.scormVersion = scormVersion;
        this.detectedTitle = detectedTitle;
        this.organizationTitle = organizationTitle;
        this.itemCount = itemCount;
        this.scoCount = scoCount;
        this.structuredAvailable = structuredAvailable;
        this.proposedMode = proposedMode;
        this.preview = preview == null ? new ArrayList<>() : preview;
        this.expiresAt = expiresAt;
    }

    public String getTemporaryImportId() { return temporaryImportId; }
    public String getOriginalFileName() { return originalFileName; }
    public String getChecksumSha256() { return checksumSha256; }
    public String getScormVersion() { return scormVersion; }
    public String getDetectedTitle() { return detectedTitle; }
    public String getOrganizationTitle() { return organizationTitle; }
    public Integer getItemCount() { return itemCount; }
    public Integer getScoCount() { return scoCount; }
    public Boolean getStructuredAvailable() { return structuredAvailable; }
    public ScormQuickCreateMode getProposedMode() { return proposedMode; }
    public List<ScormQuickCreatePreviewModule> getPreview() { return preview; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
}
