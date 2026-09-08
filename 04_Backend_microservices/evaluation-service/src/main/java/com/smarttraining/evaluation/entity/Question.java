package com.smarttraining.evaluation.entity;

import com.smarttraining.evaluation.enums.QuestionType;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "questions")
public class Question {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "quiz_id", nullable = false) private Quiz quiz;
    @Column(nullable = false, length = 1000) private String content;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private QuestionType type;
    private Integer orderIndex;
    private Integer points;
    @Column(length = 1000) private String explanation;
    @Column(name = "config_json", length = 12000) private String configJson;
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true) private List<AnswerOption> options = new ArrayList<>();

    public Question() {}
    public Long getId() { return id; }
    public Quiz getQuiz() { return quiz; } public void setQuiz(Quiz quiz) { this.quiz = quiz; }
    public String getContent() { return content; } public void setContent(String content) { this.content = content; }
    public QuestionType getType() { return type; } public void setType(QuestionType type) { this.type = type; }
    public Integer getOrderIndex() { return orderIndex; } public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public Integer getPoints() { return points; } public void setPoints(Integer points) { this.points = points; }
    public String getExplanation() { return explanation; } public void setExplanation(String explanation) { this.explanation = explanation; }
    public String getConfigJson() { return configJson; } public void setConfigJson(String configJson) { this.configJson = configJson; }
    public List<AnswerOption> getOptions() { return options; } public void setOptions(List<AnswerOption> options) { this.options = options; }
}
