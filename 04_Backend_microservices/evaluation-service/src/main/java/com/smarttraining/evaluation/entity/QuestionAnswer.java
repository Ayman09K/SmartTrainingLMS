package com.smarttraining.evaluation.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "question_answers")
public class QuestionAnswer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "attempt_id", nullable = false) private QuizAttempt attempt;
    private Long questionId;
    @Column(length = 500) private String selectedOptionIds;
    @Column(length = 1000) private String answerText;
    @Column(name = "answer_json", length = 12000) private String answerJson;
    private Boolean correct;
    private Integer pointsEarned;

    public QuestionAnswer() {}
    public Long getId() { return id; }
    public QuizAttempt getAttempt() { return attempt; } public void setAttempt(QuizAttempt attempt) { this.attempt = attempt; }
    public Long getQuestionId() { return questionId; } public void setQuestionId(Long questionId) { this.questionId = questionId; }
    public String getSelectedOptionIds() { return selectedOptionIds; } public void setSelectedOptionIds(String selectedOptionIds) { this.selectedOptionIds = selectedOptionIds; }
    public String getAnswerText() { return answerText; } public void setAnswerText(String answerText) { this.answerText = answerText; }
    public String getAnswerJson() { return answerJson; } public void setAnswerJson(String answerJson) { this.answerJson = answerJson; }
    public Boolean getCorrect() { return correct; } public void setCorrect(Boolean correct) { this.correct = correct; }
    public Integer getPointsEarned() { return pointsEarned; } public void setPointsEarned(Integer pointsEarned) { this.pointsEarned = pointsEarned; }
}
