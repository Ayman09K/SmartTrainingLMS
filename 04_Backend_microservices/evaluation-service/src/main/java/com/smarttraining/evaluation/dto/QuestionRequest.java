package com.smarttraining.evaluation.dto;

import com.smarttraining.evaluation.enums.QuestionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public class QuestionRequest {
    @NotNull @Positive private Long quizId;
    @NotBlank private String content;
    @NotNull private QuestionType type;
    @NotNull @Min(1) private Integer orderIndex;
    @NotNull @Min(1) private Integer points;
    private String explanation;
    @Valid private QuestionTypeConfigRequest typeConfig;

    public QuestionRequest() {}
    public Long getQuizId() { return quizId; } public void setQuizId(Long quizId) { this.quizId = quizId; }
    public String getContent() { return content; } public void setContent(String content) { this.content = content; }
    public QuestionType getType() { return type; } public void setType(QuestionType type) { this.type = type; }
    public Integer getOrderIndex() { return orderIndex; } public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public Integer getPoints() { return points; } public void setPoints(Integer points) { this.points = points; }
    public String getExplanation() { return explanation; } public void setExplanation(String explanation) { this.explanation = explanation; }
    public QuestionTypeConfigRequest getTypeConfig() { return typeConfig; } public void setTypeConfig(QuestionTypeConfigRequest typeConfig) { this.typeConfig = typeConfig; }
}
