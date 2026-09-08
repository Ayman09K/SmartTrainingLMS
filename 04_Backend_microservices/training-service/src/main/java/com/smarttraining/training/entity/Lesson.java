package com.smarttraining.training.entity;

import com.smarttraining.training.enums.LessonCompletionRule;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "lessons")
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(length = 1000)
    private String objective;

    @Column(length = 5000)
    private String content;

    @Column(nullable = false)
    private Integer orderIndex;

    private Integer estimatedDurationMinutes;

    @Column(nullable = false)
    private Boolean required = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private LessonCompletionRule completionRule = LessonCompletionRule.ALL_REQUIRED_BLOCKS;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id", nullable = false)
    private TrainingModule module;

    @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PedagogicalResource> resources = new ArrayList<>();

    public Lesson() {
    }

    public Lesson(String title, String content, Integer orderIndex,
                  Integer estimatedDurationMinutes, TrainingModule module) {
        this.title = title;
        this.content = content;
        this.orderIndex = orderIndex;
        this.estimatedDurationMinutes = estimatedDurationMinutes;
        this.module = module;
    }

    @PrePersist
    public void beforeCreate() {
        if (required == null) {
            required = true;
        }
        if (completionRule == null) {
            completionRule = LessonCompletionRule.ALL_REQUIRED_BLOCKS;
        }
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getObjective() { return objective; }
    public void setObjective(String objective) { this.objective = objective; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public Integer getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public void setEstimatedDurationMinutes(Integer estimatedDurationMinutes) { this.estimatedDurationMinutes = estimatedDurationMinutes; }
    public Boolean getRequired() { return required; }
    public void setRequired(Boolean required) { this.required = required; }
    public LessonCompletionRule getCompletionRule() { return completionRule; }
    public void setCompletionRule(LessonCompletionRule completionRule) { this.completionRule = completionRule; }
    public TrainingModule getModule() { return module; }
    public void setModule(TrainingModule module) { this.module = module; }
    public List<PedagogicalResource> getResources() { return resources; }
}
