package com.smarttraining.analytics.dto;

public class AssistantChatResponse {

    private String answer;
    private String model;
    private boolean contextUsed;
    private Long conversationId;

    public AssistantChatResponse() {
    }

    public AssistantChatResponse(
            String answer,
            String model,
            boolean contextUsed
    ) {
        this(
            answer,
            model,
            contextUsed,
            null
        );
    }

    public AssistantChatResponse(
            String answer,
            String model,
            boolean contextUsed,
            Long conversationId
    ) {
        this.answer = answer;
        this.model = model;
        this.contextUsed = contextUsed;
        this.conversationId = conversationId;
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

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }
}