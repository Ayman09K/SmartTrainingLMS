CREATE TABLE IF NOT EXISTS training_certificates (
    id BIGINT NOT NULL AUTO_INCREMENT,
    public_code VARCHAR(64) NOT NULL,
    learner_id BIGINT NOT NULL,
    training_id BIGINT NOT NULL,
    enrollment_id BIGINT NOT NULL,
    training_version_number INT NULL,
    learner_display_name_snapshot VARCHAR(250) NOT NULL,
    training_title_snapshot VARCHAR(250) NOT NULL,
    issued_at DATETIME(6) NOT NULL,
    revoked_at DATETIME(6) NULL,
    status ENUM('ACTIVE','REVOKED') NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_training_certificate_public_code (public_code),
    UNIQUE KEY uk_training_certificate_learner_training (learner_id, training_id),
    KEY idx_training_certificate_learner (learner_id),
    KEY idx_training_certificate_training (training_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;