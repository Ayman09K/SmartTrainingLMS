package com.smarttraining.analytics.dto;

import java.util.ArrayList;
import java.util.List;

public class AiAssistantRequest {

    private String role;
    private String message;
    private String learningContext;
    private String surface;
    private List<AssistantHistoryMessage> history = new ArrayList<>();

    public AiAssistantRequest() {
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getLearningContext() {
        return learningContext;
    }

    public void setLearningContext(String learningContext) {
        this.learningContext = learningContext;
    }

    public String getSurface() {
        return surface;
    }

    public void setSurface(String surface) {
        this.surface = surface;
    }

    public List<AssistantHistoryMessage> getHistory() {
        return history;
    }

    public void setHistory(List<AssistantHistoryMessage> history) {
        this.history = history == null ? new ArrayList<>() : history;
    }
}