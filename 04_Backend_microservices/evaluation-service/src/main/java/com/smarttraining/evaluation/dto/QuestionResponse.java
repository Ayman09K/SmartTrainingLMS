package com.smarttraining.evaluation.dto;

import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.enums.QuestionType;

public class QuestionResponse {
    private Long id; private Long quizId; private String content; private QuestionType type; private Integer orderIndex; private Integer points; private String explanation; private QuestionTypeConfigRequest typeConfig;
    public QuestionResponse() {}
    public QuestionResponse(Question question) { this(question, null); }
    public QuestionResponse(Question question, QuestionTypeConfigRequest typeConfig) {
        id=question.getId(); quizId=question.getQuiz()!=null?question.getQuiz().getId():null; content=question.getContent(); type=question.getType(); orderIndex=question.getOrderIndex(); points=question.getPoints(); explanation=question.getExplanation(); this.typeConfig=typeConfig;
    }
    public Long getId() { return id; } public Long getQuizId() { return quizId; } public String getContent() { return content; }
    public QuestionType getType() { return type; } public Integer getOrderIndex() { return orderIndex; } public Integer getPoints() { return points; } public String getExplanation() { return explanation; } public QuestionTypeConfigRequest getTypeConfig() { return typeConfig; }
}
