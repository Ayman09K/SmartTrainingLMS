package com.smarttraining.evaluation.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "answer_options")
public class AnswerOption {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "question_id", nullable = false) private Question question;
    @Column(nullable = false, length = 500) private String content;
    private Boolean correct = false;
    private Integer orderIndex;
    public AnswerOption() {}
    public Long getId() { return id; }
    public Question getQuestion() { return question; } public void setQuestion(Question question) { this.question = question; }
    public String getContent() { return content; } public void setContent(String content) { this.content = content; }
    public Boolean getCorrect() { return correct; } public void setCorrect(Boolean correct) { this.correct = correct; }
    public Integer getOrderIndex() { return orderIndex; } public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
}
