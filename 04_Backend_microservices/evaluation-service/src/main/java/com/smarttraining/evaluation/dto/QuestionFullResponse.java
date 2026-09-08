package com.smarttraining.evaluation.dto;

import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.enums.QuestionType;
import java.util.List;

public class QuestionFullResponse {
    private Long id; private Long quizId; private String content; private QuestionType type; private Integer orderIndex; private Integer points; private String explanation; private List<AnswerOptionResponse> options; private QuestionTypeConfigRequest typeConfig;
    public QuestionFullResponse() {}
    public QuestionFullResponse(Question question,List<AnswerOptionResponse> options) { this(question, options, null); }
    public QuestionFullResponse(Question question,List<AnswerOptionResponse> options,QuestionTypeConfigRequest typeConfig) {
        id=question.getId(); quizId=question.getQuiz()!=null?question.getQuiz().getId():null; content=question.getContent(); type=question.getType(); orderIndex=question.getOrderIndex(); points=question.getPoints(); explanation=question.getExplanation(); this.options=options; this.typeConfig=typeConfig;
    }
    public Long getId() { return id; } public Long getQuizId() { return quizId; } public String getContent() { return content; }
    public QuestionType getType() { return type; } public Integer getOrderIndex() { return orderIndex; } public Integer getPoints() { return points; } public String getExplanation() { return explanation; } public List<AnswerOptionResponse> getOptions() { return options; } public QuestionTypeConfigRequest getTypeConfig() { return typeConfig; }
}
