package com.smarttraining.training.dto.scorm;

import jakarta.validation.constraints.NotBlank;
import java.util.LinkedHashMap;
import java.util.Map;

public class ScormRuntimeCommitRequest {

    @NotBlank
    private String clientCommitId;

    private Map<String, String> values = new LinkedHashMap<>();

    private Boolean finished = false;

    public ScormRuntimeCommitRequest() {}

    public String getClientCommitId() { return clientCommitId; }
    public void setClientCommitId(String clientCommitId) { this.clientCommitId = clientCommitId; }
    public Map<String, String> getValues() { return values; }
    public void setValues(Map<String, String> values) { this.values = values; }
    public Boolean getFinished() { return finished; }
    public void setFinished(Boolean finished) { this.finished = finished; }
}