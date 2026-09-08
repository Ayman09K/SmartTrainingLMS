package com.smarttraining.evaluation.analytics;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class QuizAnalyticsEventListener {

    private static final Logger LOGGER =
        LoggerFactory.getLogger(QuizAnalyticsEventListener.class);

    private final AnalyticsInternalClient client;

    public QuizAnalyticsEventListener(AnalyticsInternalClient client) {
        this.client = client;
    }

    @TransactionalEventListener(
        phase = TransactionPhase.AFTER_COMMIT,
        fallbackExecution = true
    )
    public void onQuizAnalyticsEvent(QuizAnalyticsEvent event) {
        try {
            client.send(event.request());
        } catch (Exception exception) {
            LOGGER.warn(
                "Analytics indisponible. Evenement quiz non envoye. type={}",
                event.request().getEventType()
            );
        }
    }
}