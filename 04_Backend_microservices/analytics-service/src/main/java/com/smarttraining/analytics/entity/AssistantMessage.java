package com.smarttraining.analytics.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "assistant_messages",
    indexes = {
        @Index(
            name = "idx_assistant_message_conversation_created",
            columnList = "conversation_id, created_at"
        )
    }
)
public class AssistantMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "conversation_id",
        nullable = false,
        foreignKey = @ForeignKey(
            name = "fk_assistant_message_conversation"
        )
    )
    private AssistantConversation conversation;

    @Column(name = "role", nullable = false, length = 16)
    private String role;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "training_id")
    private Long trainingId;

    @Column(name = "lesson_id")
    private Long lessonId;

    @Column(name = "surface", length = 10)
    private String surface;

    @Column(name = "model", length = 120)
    private String model;

    @Column(name = "context_used", nullable = false)
    private boolean contextUsed;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public AssistantMessage() {
    }

    public AssistantMessage(
            AssistantConversation conversation,
            String role,
            String content,
            Long trainingId,
            Long lessonId,
            String surface,
            String model,
            boolean contextUsed
    ) {
        this.conversation = conversation;
        this.role = role;
        this.content = content;
        this.trainingId = trainingId;
        this.lessonId = lessonId;
        this.surface = surface;
        this.model = model;
        this.contextUsed = contextUsed;
    }

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public AssistantConversation getConversation() {
        return conversation;
    }

    public String getRole() {
        return role;
    }

    public String getContent() {
        return content;
    }

    public Long getTrainingId() {
        return trainingId;
    }

    public Long getLessonId() {
        return lessonId;
    }

    public String getSurface() {
        return surface;
    }

    public String getModel() {
        return model;
    }

    public boolean isContextUsed() {
        return contextUsed;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
