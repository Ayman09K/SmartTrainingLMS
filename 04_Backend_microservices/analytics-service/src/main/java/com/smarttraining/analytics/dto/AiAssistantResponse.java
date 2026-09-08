package com.smarttraining.analytics.dto;

public class AiAssistantResponse {

    private String answer;
    private String model;
    private boolean contextUsed;

    public AiAssistantResponse() {
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public boolean isContextUsed() {
        return contextUsed;
    }

    public void setContextUsed(boolean contextUsed) {
        this.contextUsed = contextUsed;
    }
}