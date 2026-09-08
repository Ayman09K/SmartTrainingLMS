package com.smarttraining.evaluation.dto;

import jakarta.validation.constraints.*;

public class AnswerOptionRequest {
    @NotNull @Positive private Long questionId;
    @NotBlank private String content;
    @NotNull private Boolean correct;
    @NotNull @Min(1) private Integer orderIndex;
    public AnswerOptionRequest() {}
    public Long getQuestionId() { return questionId; } public void setQuestionId(Long questionId) { this.questionId = questionId; }
    public String getContent() { return content; } public void setContent(String content) { this.content = content; }
    public Boolean getCorrect() { return correct; } public void setCorrect(Boolean correct) { this.correct = correct; }
    public Integer getOrderIndex() { return orderIndex; } public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
}
