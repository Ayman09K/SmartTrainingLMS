package com.smarttraining.training.dto;

public class LearningCompletionResponse {

    private final String completionType;
    private final Long learnerId;
    private final Long trainingId;
    private final Long lessonId;
    private final Long resourceId;
    private final Long analyticsEventId;
    private final boolean progressAffecting;

    public LearningCompletionResponse(
            String completionType,
            Long learnerId,
            Long trainingId,
            Long lessonId,
            Long resourceId,
            Long analyticsEventId,
            boolean progressAffecting
    ) {
        this.completionType = completionType;
        this.learnerId = learnerId;
        this.trainingId = trainingId;
        this.lessonId = lessonId;
        this.resourceId = resourceId;
        this.analyticsEventId = analyticsEventId;
        this.progressAffecting = progressAffecting;
    }

    public String getCompletionType() { return completionType; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public Long getLessonId() { return lessonId; }
    public Long getResourceId() { return resourceId; }
    public Long getAnalyticsEventId() { return analyticsEventId; }
    public boolean isProgressAffecting() { return progressAffecting; }
}