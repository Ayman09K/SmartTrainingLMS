CREATE TABLE IF NOT EXISTS learner_group_training_assignments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    group_id BIGINT NOT NULL,
    training_id BIGINT NOT NULL,
    assigned_by BIGINT NOT NULL,
    due_at DATETIME(6) NULL,
    assigned_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_learner_group_training_assignment
        UNIQUE (group_id, training_id),
    INDEX idx_learner_group_training_group (group_id),
    INDEX idx_learner_group_training_training (training_id)
);