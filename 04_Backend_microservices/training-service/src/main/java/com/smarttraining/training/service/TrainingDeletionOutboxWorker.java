package com.smarttraining.training.service;

import com.smarttraining.training.client.AnalyticsInternalClient;
import com.smarttraining.training.client.EvaluationInternalClient;
import com.smarttraining.training.entity.TrainingDeletionOutbox;
import com.smarttraining.training.repository.TrainingDeletionOutboxRepository;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainingDeletionOutboxWorker {

    private final TrainingDeletionOutboxRepository repository;
    private final EvaluationInternalClient evaluationClient;
    private final AnalyticsInternalClient analyticsClient;

    public TrainingDeletionOutboxWorker(
            TrainingDeletionOutboxRepository repository,
            EvaluationInternalClient evaluationClient,
            AnalyticsInternalClient analyticsClient
    ) {
        this.repository = repository;
        this.evaluationClient = evaluationClient;
        this.analyticsClient = analyticsClient;
    }

    @Scheduled(
            initialDelayString =
                    "${SMARTTRAINING_TRAINING_DELETE_OUTBOX_INITIAL_DELAY_MS:5000}",
            fixedDelayString =
                    "${SMARTTRAINING_TRAINING_DELETE_OUTBOX_RETRY_DELAY_MS:30000}"
    )
    @Transactional
    public void retryPending() {
        List<TrainingDeletionOutbox> pending =
                repository.findTop20ByCompletedFalseOrderByIdAsc();

        for (TrainingDeletionOutbox item : pending) {
            process(item);
        }
    }

    private void process(TrainingDeletionOutbox item) {
        try {
            evaluationClient.purgeTraining(item.getTrainingId());
            analyticsClient.purgeTraining(item.getTrainingId());
            item.markCompleted();
        } catch (RuntimeException exception) {
            item.markFailure(exception);
        }
    }
}