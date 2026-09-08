package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.InternalTrainingLearnerMetricsResponse;
import com.smarttraining.analytics.dto.LearnerProgressResponse;
import com.smarttraining.analytics.dto.RiskIndicatorResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InternalTrainingReportingService {

    private final AnalyticsService analyticsService;

    public InternalTrainingReportingService(
            AnalyticsService analyticsService
    ) {
        this.analyticsService = analyticsService;
    }

    @Transactional(readOnly = true)
    public List<InternalTrainingLearnerMetricsResponse> resolve(
            Long trainingId,
            List<Long> learnerIds
    ) {
        if (trainingId == null || trainingId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant formation invalide."
            );
        }

        if (learnerIds == null || learnerIds.isEmpty()) {
            return List.of();
        }

        List<Long> uniqueIds =
                learnerIds.stream()
                        .filter(id -> id != null && id > 0)
                        .distinct()
                        .limit(200)
                        .toList();

        Map<Long, LearnerProgressResponse> progressByLearner =
                new LinkedHashMap<>();

        analyticsService
                .getProgressByTraining(trainingId)
                .forEach(progress -> {
                    if (progress.getLearnerId() != null
                            && uniqueIds.contains(
                                progress.getLearnerId()
                            )) {
                        progressByLearner.put(
                                progress.getLearnerId(),
                                progress
                        );
                    }
                });

        return uniqueIds.stream()
                .map(learnerId ->
                        metrics(
                            learnerId,
                            trainingId,
                            progressByLearner.get(learnerId)
                        )
                )
                .toList();
    }

    private InternalTrainingLearnerMetricsResponse metrics(
            Long learnerId,
            Long trainingId,
            LearnerProgressResponse progress
    ) {
        RiskIndicatorResponse risk =
                analyticsService
                        .getLearnerTrainingRiskIndicator(
                                learnerId,
                                trainingId
                        );

        return new InternalTrainingLearnerMetricsResponse(
                learnerId,
                trainingId,
                progress == null
                        ? null
                        : progress.getAverageScore(),
                risk == null || risk.getRiskLevel() == null
                        ? null
                        : risk.getRiskLevel().name(),
                risk == null || risk.getDataStatus() == null
                        ? null
                        : risk.getDataStatus().name(),
                progress == null
                        ? null
                        : progress.getLastActivityAt()
        );
    }
}