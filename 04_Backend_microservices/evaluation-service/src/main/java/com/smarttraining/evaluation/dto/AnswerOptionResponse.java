package com.smarttraining.evaluation.dto;

import com.smarttraining.evaluation.entity.AnswerOption;

public class AnswerOptionResponse {
    private Long id; private Long questionId; private String content; private Boolean correct; private Integer orderIndex;
    public AnswerOptionResponse() {}
    public AnswerOptionResponse(AnswerOption option) { id=option.getId(); questionId=option.getQuestion()!=null?option.getQuestion().getId():null; content=option.getContent(); correct=option.getCorrect(); orderIndex=option.getOrderIndex(); }
    public Long getId() { return id; } public Long getQuestionId() { return questionId; } public String getContent() { return content; }
    public Boolean getCorrect() { return correct; } public Integer getOrderIndex() { return orderIndex; }
}
