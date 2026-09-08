package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.BiActivityPointResponse;
import com.smarttraining.analytics.dto.BiDistributionResponse;
import com.smarttraining.analytics.dto.BiSummaryResponse;
import com.smarttraining.analytics.dto.BiTrainingMetricResponse;
import com.smarttraining.analytics.dto.RiskIndicatorResponse;
import com.smarttraining.analytics.entity.LearnerProgress;
import com.smarttraining.analytics.entity.LearningEvent;
import com.smarttraining.analytics.integration.TrainingBiScopeClient;
import com.smarttraining.analytics.integration.TrainingBiScopeResponse;
import com.smarttraining.analytics.integration.TrainingBiScopeResponse.EnrollmentScope;
import com.smarttraining.analytics.integration.TrainingBiScopeResponse.TrainingScope;
import com.smarttraining.analytics.repository.LearnerProgressRepository;
import com.smarttraining.analytics.repository.LearningEventRepository;
import com.smarttraining.analytics.security.AuthenticatedUser;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class BiAnalyticsService {

    private static final int MAX_PERIOD_DAYS = 366;

    private final TrainingBiScopeClient trainingClient;
    private final LearnerProgressRepository progressRepository;
    private final LearningEventRepository eventRepository;
    private final AnalyticsService analyticsService;

    public BiAnalyticsService(
            TrainingBiScopeClient trainingClient,
            LearnerProgressRepository progressRepository,
            LearningEventRepository eventRepository,
            AnalyticsService analyticsService
    ) {
        this.trainingClient = trainingClient;
        this.progressRepository = progressRepository;
        this.eventRepository = eventRepository;
        this.analyticsService = analyticsService;
    }

    public BiSummaryResponse summary(
            AuthenticatedUser actor,
            LocalDate from,
            LocalDate to,
            Long trainingId,
            String enrollmentStatus
    ) {
        Period period = period(from, to);

        List<TrainingAggregate> aggregates =
                aggregates(
                        actor,
                        period,
                        trainingId,
                        enrollmentStatus
                );

        Set<Long> allLearners = new HashSet<>();
        Set<Long> activeLearners = new HashSet<>();
        Set<Long> atRiskLearners = new HashSet<>();
        Set<Long> insufficientLearners =
                new HashSet<>();

        List<Integer> progressValues =
                new ArrayList<>();
        List<Integer> scoreValues =
                new ArrayList<>();

        long totalEnrollments = 0;
        long activeEnrollments = 0;
        long completedEnrollments = 0;
        long totalEvents = 0;

        for (TrainingAggregate aggregate : aggregates) {
            totalEnrollments +=
                    aggregate.enrollments().size();

            activeEnrollments +=
                    countEnrollmentStatus(
                            aggregate.enrollments(),
                            "ACTIVE"
                    );

            completedEnrollments +=
                    countEnrollmentStatus(
                            aggregate.enrollments(),
                            "COMPLETED"
                    );

            totalEvents += aggregate.events().size();

            aggregate.enrollments().stream()
                    .map(EnrollmentScope::learnerId)
                    .filter(Objects::nonNull)
                    .forEach(allLearners::add);

            aggregate.events().stream()
                    .map(LearningEvent::getLearnerId)
                    .filter(Objects::nonNull)
                    .forEach(activeLearners::add);

            aggregate.progress().stream()
                    .map(
                        LearnerProgress::getProgressPercentage
                    )
                    .filter(Objects::nonNull)
                    .forEach(progressValues::add);

            scoreValues.addAll(
                    actualScoreValues(
                            aggregate.progress()
                    )
            );

            aggregate.risks()
                    .forEach((learnerId, risk) -> {
                        if (isAtRisk(risk)) {
                            atRiskLearners.add(
                                    learnerId
                            );
                        }

                        if (isDataInsufficient(risk)) {
                            insufficientLearners.add(
                                    learnerId
                            );
                        }
                    });
        }

        long publishedTrainings =
                aggregates.stream()
                        .filter(aggregate ->
                                isPublished(
                                    aggregate.training()
                                        .status()
                                )
                        )
                        .count();

        return new BiSummaryResponse(
                period.from(),
                period.to(),
                aggregates.size(),
                publishedTrainings,
                allLearners.size(),
                totalEnrollments,
                activeEnrollments,
                completedEnrollments,
                percentage(
                        completedEnrollments,
                        totalEnrollments
                ),
                average(progressValues),
                average(scoreValues),
                activeLearners.size(),
                atRiskLearners.size(),
                insufficientLearners.size(),
                totalEvents
        );
    }

    public List<BiTrainingMetricResponse> trainings(
            AuthenticatedUser actor,
            LocalDate from,
            LocalDate to,
            Long trainingId,
            String enrollmentStatus
    ) {
        Period period = period(from, to);

        return aggregates(
                    actor,
                    period,
                    trainingId,
                    enrollmentStatus
                )
                .stream()
                .map(this::trainingMetric)
                .sorted(
                    Comparator.comparing(
                        BiTrainingMetricResponse::trainingId
                    )
                )
                .toList();
    }

    public List<BiActivityPointResponse> activity(
            AuthenticatedUser actor,
            LocalDate from,
            LocalDate to,
            Long trainingId,
            String enrollmentStatus
    ) {
        Period period = period(from, to);

        List<TrainingAggregate> aggregates =
                aggregates(
                        actor,
                        period,
                        trainingId,
                        enrollmentStatus
                );

        Map<LocalDate, Long> eventsByDate =
                new LinkedHashMap<>();
        Map<LocalDate, Set<Long>> learnersByDate =
                new LinkedHashMap<>();

        LocalDate current = period.from();

        while (!current.isAfter(period.to())) {
            eventsByDate.put(current, 0L);
            learnersByDate.put(
                    current,
                    new HashSet<>()
            );
            current = current.plusDays(1);
        }

        for (TrainingAggregate aggregate : aggregates) {
            for (LearningEvent event :
                    aggregate.events()) {
                if (event.getEventDate() == null) {
                    continue;
                }

                LocalDate date =
                        event.getEventDate()
                                .toLocalDate();

                eventsByDate.computeIfPresent(
                        date,
                        (key, value) -> value + 1L
                );

                if (event.getLearnerId() != null) {
                    Set<Long> learners =
                            learnersByDate.get(date);

                    if (learners != null) {
                        learners.add(
                                event.getLearnerId()
                        );
                    }
                }
            }
        }

        List<BiActivityPointResponse> result =
                new ArrayList<>();

        for (LocalDate date :
                eventsByDate.keySet()) {
            result.add(
                new BiActivityPointResponse(
                        date,
                        eventsByDate.get(date),
                        learnersByDate.get(date).size()
                )
            );
        }

        return List.copyOf(result);
    }

    public BiDistributionResponse distributions(
            AuthenticatedUser actor,
            LocalDate from,
            LocalDate to,
            Long trainingId,
            String enrollmentStatus
    ) {
        Period period = period(from, to);

        List<TrainingAggregate> aggregates =
                aggregates(
                        actor,
                        period,
                        trainingId,
                        enrollmentStatus
                );

        Map<String, Long> progress =
                distributionMap(
                        "0",
                        "1-49",
                        "50-99",
                        "100"
                );

        Map<String, Long> scores =
                distributionMap(
                        "0-49",
                        "50-69",
                        "70-84",
                        "85-100"
                );

        Map<String, Long> risk =
                distributionMap(
                        "LOW",
                        "MEDIUM",
                        "HIGH",
                        "DATA_INSUFFICIENT"
                );

        for (TrainingAggregate aggregate : aggregates) {
            for (LearnerProgress item :
                    aggregate.progress()) {
                Integer value =
                        item.getProgressPercentage();

                if (value == null) {
                    continue;
                }

                increment(
                        progress,
                        progressBucket(value)
                );
            }

            for (Integer score :
                    actualScoreValues(
                            aggregate.progress()
                    )) {
                increment(
                        scores,
                        scoreBucket(score)
                );
            }

            for (RiskIndicatorResponse item :
                    aggregate.risks().values()) {
                String level = riskLevel(item);

                if (risk.containsKey(level)) {
                    increment(risk, level);
                }
            }
        }

        return new BiDistributionResponse(
                Map.copyOf(progress),
                Map.copyOf(scores),
                Map.copyOf(risk)
        );
    }

    private List<TrainingAggregate> aggregates(
            AuthenticatedUser actor,
            Period period,
            Long trainingId,
            String enrollmentStatus
    ) {
        requireEducator(actor);

        String status =
                normalizeEnrollmentStatus(
                        enrollmentStatus
                );

        TrainingBiScopeResponse scope =
                trainingClient.resolve(
                        actor.getUserId(),
                        actor.getRole(),
                        trainingId
                );

        if (
            scope.trainings() == null
            || scope.trainings().isEmpty()
        ) {
            return List.of();
        }

        List<TrainingAggregate> result =
                new ArrayList<>();

        for (TrainingScope training :
                scope.trainings()) {
            result.add(
                aggregate(
                        training,
                        period,
                        status
                )
            );
        }

        return List.copyOf(result);
    }

    private TrainingAggregate aggregate(
            TrainingScope training,
            Period period,
            String enrollmentStatus
    ) {
        List<EnrollmentScope> enrollments =
                safeEnrollments(training)
                        .stream()
                        .filter(item ->
                                enrollmentStatus == null
                                || enrollmentStatus.equals(
                                    item.status()
                                )
                        )
                        .toList();

        Set<Long> learnerIds =
                enrollments.stream()
                        .map(EnrollmentScope::learnerId)
                        .filter(Objects::nonNull)
                        .collect(
                            java.util.stream.Collectors
                                .toSet()
                        );

        if (learnerIds.isEmpty()) {
            return new TrainingAggregate(
                    training,
                    enrollments,
                    List.of(),
                    List.of(),
                    Map.of()
            );
        }

        List<LearnerProgress> progress =
                progressRepository
                        .findByTrainingId(
                                training.trainingId()
                        )
                        .stream()
                        .filter(item ->
                                learnerIds.contains(
                                    item.getLearnerId()
                                )
                        )
                        .toList();

        List<LearningEvent> events =
                eventRepository
                        .findByTrainingIdAndEventDateGreaterThanEqualAndEventDateLessThanOrderByEventDateDesc(
                                training.trainingId(),
                                period.fromInclusive(),
                                period.toExclusive()
                        )
                        .stream()
                        .filter(item ->
                                learnerIds.contains(
                                    item.getLearnerId()
                                )
                        )
                        .toList();

        Map<Long, RiskIndicatorResponse> risks =
                new LinkedHashMap<>();

        for (Long learnerId : learnerIds) {
            RiskIndicatorResponse risk =
                    analyticsService
                            .getLearnerTrainingRiskIndicator(
                                    learnerId,
                                    training.trainingId()
                            );

            if (risk != null) {
                risks.put(learnerId, risk);
            }
        }

        return new TrainingAggregate(
                training,
                enrollments,
                progress,
                events,
                Map.copyOf(risks)
        );
    }

    private BiTrainingMetricResponse trainingMetric(
            TrainingAggregate aggregate
    ) {
        long total =
                aggregate.enrollments().size();

        long active =
                countEnrollmentStatus(
                        aggregate.enrollments(),
                        "ACTIVE"
                );

        long completed =
                countEnrollmentStatus(
                        aggregate.enrollments(),
                        "COMPLETED"
                );

        Set<Long> activeLearners =
                new HashSet<>();

        aggregate.events().stream()
                .map(LearningEvent::getLearnerId)
                .filter(Objects::nonNull)
                .forEach(activeLearners::add);

        long atRisk =
                aggregate.risks().values()
                        .stream()
                        .filter(this::isAtRisk)
                        .count();

        long insufficient =
                aggregate.risks().values()
                        .stream()
                        .filter(
                            this::isDataInsufficient
                        )
                        .count();

        List<Integer> progressValues =
                aggregate.progress()
                        .stream()
                        .map(
                            LearnerProgress
                                ::getProgressPercentage
                        )
                        .filter(Objects::nonNull)
                        .toList();

        LocalDateTime lastActivity =
                aggregate.events()
                        .stream()
                        .map(
                            LearningEvent::getEventDate
                        )
                        .filter(Objects::nonNull)
                        .max(
                            LocalDateTime::compareTo
                        )
                        .orElse(null);

        return new BiTrainingMetricResponse(
                aggregate.training()
                        .trainingId(),
                aggregate.training().title(),
                aggregate.training().status(),
                total,
                active,
                completed,
                percentage(completed, total),
                average(progressValues),
                average(
                    actualScoreValues(
                        aggregate.progress()
                    )
                ),
                activeLearners.size(),
                atRisk,
                insufficient,
                aggregate.events().size(),
                lastActivity
        );
    }

    private List<Integer> actualScoreValues(
            List<LearnerProgress> progress
    ) {
        return progress.stream()
                .filter(item ->
                        item.getCompletedQuizzes() != null
                        && item.getCompletedQuizzes() > 0
                )
                .map(LearnerProgress::getAverageScore)
                .filter(Objects::nonNull)
                .toList();
    }

    private long countEnrollmentStatus(
            List<EnrollmentScope> enrollments,
            String status
    ) {
        return enrollments.stream()
                .filter(item ->
                        status.equals(item.status())
                )
                .count();
    }

    private boolean isAtRisk(
            RiskIndicatorResponse risk
    ) {
        String level = riskLevel(risk);

        return "MEDIUM".equals(level)
                || "HIGH".equals(level);
    }

    private boolean isDataInsufficient(
            RiskIndicatorResponse risk
    ) {
        if (
            "DATA_INSUFFICIENT".equals(
                riskLevel(risk)
            )
        ) {
            return true;
        }

        return risk != null
                && risk.getDataStatus() != null
                && "INSUFFICIENT".equals(
                    risk.getDataStatus().name()
                );
    }

    private String riskLevel(
            RiskIndicatorResponse risk
    ) {
        if (
            risk == null
            || risk.getRiskLevel() == null
        ) {
            return "";
        }

        return risk.getRiskLevel().name();
    }

    private boolean isPublished(String status) {
        return "PUBLISHED".equals(status)
                || "ACTIVE".equals(status);
    }

    private List<EnrollmentScope> safeEnrollments(
            TrainingScope training
    ) {
        if (training.enrollments() == null) {
            return List.of();
        }

        return training.enrollments();
    }

    private String normalizeEnrollmentStatus(
            String enrollmentStatus
    ) {
        if (
            enrollmentStatus == null
            || enrollmentStatus.isBlank()
        ) {
            return null;
        }

        String status =
                enrollmentStatus
                        .trim()
                        .toUpperCase(
                            Locale.ROOT
                        );

        if (
            !"ACTIVE".equals(status)
            && !"COMPLETED".equals(status)
            && !"CANCELLED".equals(status)
        ) {
            throw new IllegalArgumentException(
                    "Statut inscription invalide."
            );
        }

        return status;
    }

    private Period period(
            LocalDate from,
            LocalDate to
    ) {
        LocalDate resolvedTo =
                to == null
                        ? LocalDate.now()
                        : to;

        LocalDate resolvedFrom =
                from == null
                        ? resolvedTo.minusDays(29)
                        : from;

        if (resolvedFrom.isAfter(resolvedTo)) {
            throw new IllegalArgumentException(
                    "La date from doit preceder to."
            );
        }

        long days =
                java.time.temporal.ChronoUnit
                        .DAYS
                        .between(
                            resolvedFrom,
                            resolvedTo
                        )
                        + 1L;

        if (days > MAX_PERIOD_DAYS) {
            throw new IllegalArgumentException(
                    "Periode BI limitee a "
                    + MAX_PERIOD_DAYS
                    + " jours."
            );
        }

        return new Period(
                resolvedFrom,
                resolvedTo,
                resolvedFrom.atStartOfDay(),
                resolvedTo.plusDays(1)
                        .atStartOfDay()
        );
    }

    private Double average(
            List<Integer> values
    ) {
        if (values == null || values.isEmpty()) {
            return null;
        }

        double value =
                values.stream()
                        .mapToInt(
                            Integer::intValue
                        )
                        .average()
                        .orElse(0.0);

        return roundOne(value);
    }

    private double percentage(
            long numerator,
            long denominator
    ) {
        if (denominator <= 0L) {
            return 0.0;
        }

        return roundOne(
                numerator * 100.0
                / denominator
        );
    }

    private double roundOne(double value) {
        return Math.round(value * 10.0)
                / 10.0;
    }

    private Map<String, Long> distributionMap(
            String... keys
    ) {
        Map<String, Long> result =
                new LinkedHashMap<>();

        for (String key : keys) {
            result.put(key, 0L);
        }

        return result;
    }

    private void increment(
            Map<String, Long> map,
            String key
    ) {
        map.computeIfPresent(
                key,
                (ignored, value) -> value + 1L
        );
    }

    private String progressBucket(int value) {
        if (value <= 0) {
            return "0";
        }

        if (value < 50) {
            return "1-49";
        }

        if (value < 100) {
            return "50-99";
        }

        return "100";
    }

    private String scoreBucket(int value) {
        if (value < 50) {
            return "0-49";
        }

        if (value < 70) {
            return "50-69";
        }

        if (value < 85) {
            return "70-84";
        }

        return "85-100";
    }

    private void requireEducator(
            AuthenticatedUser actor
    ) {
        if (
            actor == null
            || !actor.isEducator()
        ) {
            throw new org.springframework.security
                    .access.AccessDeniedException(
                        "BI reserve aux administrateurs "
                        + "et formateurs."
                    );
        }
    }

    private record Period(
            LocalDate from,
            LocalDate to,
            LocalDateTime fromInclusive,
            LocalDateTime toExclusive
    ) {
    }

    private record TrainingAggregate(
            TrainingScope training,
            List<EnrollmentScope> enrollments,
            List<LearnerProgress> progress,
            List<LearningEvent> events,
            Map<Long, RiskIndicatorResponse> risks
    ) {
    }
}