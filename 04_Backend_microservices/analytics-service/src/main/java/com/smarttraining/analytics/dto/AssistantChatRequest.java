package com.smarttraining.analytics.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;

public class AssistantChatRequest {

    @NotBlank
    @Size(max = 2000)
    private String message;

    @Positive
    private Long trainingId;

    @Positive
    private Long lessonId;

    @Pattern(regexp = "^(MOBILE|WEB)$")
    private String surface;

    @Positive
    private Long conversationId;

    /*
     * Backward-compatible client field only.
     * The backend never trusts this history for Gemini.
     */
    @Valid
    @Size(max = 8)
    private List<AssistantHistoryMessage> history = new ArrayList<>();

    public AssistantChatRequest() {
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Long getTrainingId() {
        return trainingId;
    }

    public void setTrainingId(Long trainingId) {
        this.trainingId = trainingId;
    }

    public Long getLessonId() {
        return lessonId;
    }

    public void setLessonId(Long lessonId) {
        this.lessonId = lessonId;
    }

    public String getSurface() {
        return surface;
    }

    public void setSurface(String surface) {
        this.surface = surface;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public List<AssistantHistoryMessage> getHistory() {
        return history;
    }

    public void setHistory(List<AssistantHistoryMessage> history) {
        this.history = history == null ? new ArrayList<>() : history;
    }
}