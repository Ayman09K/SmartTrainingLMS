package com.smarttraining.training.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "learner_group_members",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_learner_group_member",
            columnNames = {"group_id", "learner_id"}
        )
    }
)
public class LearnerGroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private LearnerGroup group;

    @Column(name = "learner_id", nullable = false)
    private Long learnerId;

    @Column(name = "added_by", nullable = false)
    private Long addedBy;

    @Column(name = "added_at", nullable = false)
    private LocalDateTime addedAt;

    public LearnerGroupMember() {
    }

    public LearnerGroupMember(
            LearnerGroup group,
            Long learnerId,
            Long addedBy
    ) {
        this.group = group;
        this.learnerId = learnerId;
        this.addedBy = addedBy;
    }

    @PrePersist
    public void beforeCreate() {
        if (addedAt == null) {
            addedAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public LearnerGroup getGroup() {
        return group;
    }

    public Long getLearnerId() {
        return learnerId;
    }

    public Long getAddedBy() {
        return addedBy;
    }

    public LocalDateTime getAddedAt() {
        return addedAt;
    }
}
