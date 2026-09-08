package com.smarttraining.analytics.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class TrainingProgressProjectionListener {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(TrainingProgressProjectionListener.class);

    private final TrainingProgressProjectionClient client;

    public TrainingProgressProjectionListener(TrainingProgressProjectionClient client) {
        this.client = client;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProgressRecalculated(ProgressProjectionEvent event) {
        try {
            client.project(event);
        } catch (Exception exception) {
            LOGGER.error(
                    "Projection de progression vers training-service impossible pour learnerId={} trainingId={}",
                    event.learnerId(),
                    event.trainingId(),
                    exception
            );
        }
    }
}