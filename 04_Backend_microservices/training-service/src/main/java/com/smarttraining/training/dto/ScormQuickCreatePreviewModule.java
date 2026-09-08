package com.smarttraining.training.dto;

import java.util.ArrayList;
import java.util.List;

public class ScormQuickCreatePreviewModule {

    private String title;
    private List<ScormQuickCreatePreviewLesson> lessons = new ArrayList<>();

    public ScormQuickCreatePreviewModule() {
    }

    public ScormQuickCreatePreviewModule(
            String title,
            List<ScormQuickCreatePreviewLesson> lessons
    ) {
        this.title = title;
        this.lessons = lessons == null ? new ArrayList<>() : lessons;
    }

    public String getTitle() {
        return title;
    }

    public List<ScormQuickCreatePreviewLesson> getLessons() {
        return lessons;
    }
}
