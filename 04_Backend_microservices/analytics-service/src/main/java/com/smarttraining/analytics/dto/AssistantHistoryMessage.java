package com.smarttraining.analytics.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AssistantHistoryMessage {

    @NotBlank
    @Pattern(regexp = "^(user|assistant)$")
    private String role;

    @NotBlank
    @Size(max = 1500)
    private String content;

    public AssistantHistoryMessage() {
    }

    public AssistantHistoryMessage(String role, String content) {
        this.role = role;
        this.content = content;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}