package com.smarttraining.training.scorm.integration;

import com.smarttraining.training.client.AnalyticsInternalClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class ScormAnalyticsEventListener {

    private static final Logger LOGGER =
        LoggerFactory.getLogger(ScormAnalyticsEventListener.class);

    private final AnalyticsInternalClient analyticsClient;

    public ScormAnalyticsEventListener(AnalyticsInternalClient analyticsClient) {
        this.analyticsClient = analyticsClient;
    }

    @TransactionalEventListener(
        phase = TransactionPhase.AFTER_COMMIT,
        fallbackExecution = true
    )
    public void onEvent(ScormAnalyticsEvent event) {
        try {
            analyticsClient.publish(event.request());
        } catch (Exception exception) {
            LOGGER.error(
                "Publication Analytics SCORM impossible. eventType={} learnerId={} trainingId={}",
                event.request().getEventType(),
                event.request().getLearnerId(),
                event.request().getTrainingId(),
                exception
            );
        }
    }
}