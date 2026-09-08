package com.smarttraining.training.enums;

public enum TrainingStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED,

    // Compatibilité si d’anciennes données existent en base ou dans un ancien test.
    ACTIVE,
    INACTIVE;

    public TrainingStatus normalized() {
        if (this == ACTIVE) {
            return PUBLISHED;
        }

        if (this == INACTIVE) {
            return DRAFT;
        }

        return this;
    }

    public boolean isVisibleToLearner() {
        return normalized() == PUBLISHED;
    }
}
