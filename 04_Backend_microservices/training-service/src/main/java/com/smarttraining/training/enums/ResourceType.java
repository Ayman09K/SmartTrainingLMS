package com.smarttraining.training.enums;

public enum ResourceType {
    TEXT,
    IMAGE,
    VIDEO,
    PDF,
    DOCUMENT,
    EXTERNAL_LINK,
    SCORM,

    // Compatibilité avec ton ancien code.
    PDF_URL,
    VIDEO_URL;

    public ResourceType normalized() {
        if (this == PDF_URL) {
            return PDF;
        }

        if (this == VIDEO_URL) {
            return VIDEO;
        }

        return this;
    }

    public boolean isLegacyUrlType() {
        return this == PDF_URL || this == VIDEO_URL;
    }
}
