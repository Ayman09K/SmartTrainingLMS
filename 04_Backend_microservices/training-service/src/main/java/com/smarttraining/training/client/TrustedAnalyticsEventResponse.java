package com.smarttraining.training.client;

public class TrustedAnalyticsEventResponse {

    private Long id;
    private Long learnerId;
    private Long trainingId;
    private Long moduleId;
    private Long lessonId;
    private Long resourceId;
    private String eventType;
    private String source;

    public TrustedAnalyticsEventResponse() {}

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public Long getModuleId() { return moduleId; }
    public Long getLessonId() { return lessonId; }
    public Long getResourceId() { return resourceId; }
    public String getEventType() { return eventType; }
    public String getSource() { return source; }
}