package com.smarttraining.evaluation.dto;

import com.smarttraining.evaluation.entity.QuestionAnswer;

public class QuestionAnswerResponse {
    private Long id;
    private Long attemptId;
    private Long questionId;
    private String selectedOptionIds;
    private String answerText;
    private String answerJson;
    private Boolean correct;
    private Integer pointsEarned;

    public QuestionAnswerResponse() {}

    public QuestionAnswerResponse(QuestionAnswer answer) {
        id = answer.getId();
        attemptId = answer.getAttempt() != null
                ? answer.getAttempt().getId()
                : null;
        questionId = answer.getQuestionId();
        selectedOptionIds = answer.getSelectedOptionIds();
        answerText = answer.getAnswerText();
        answerJson = answer.getAnswerJson();
        correct = answer.getCorrect();
        pointsEarned = answer.getPointsEarned();
    }

    public Long getId() { return id; }
    public Long getAttemptId() { return attemptId; }
    public Long getQuestionId() { return questionId; }
    public String getSelectedOptionIds() { return selectedOptionIds; }
    public String getAnswerText() { return answerText; }
    public String getAnswerJson() { return answerJson; }
    public Boolean getCorrect() { return correct; }
    public Integer getPointsEarned() { return pointsEarned; }
}
