package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.LearnerProgressResponse;
import com.smarttraining.analytics.dto.LearningEventResponse;
import com.smarttraining.analytics.dto.SelfLearningEventRequest;
import com.smarttraining.analytics.dto.TrustedLearningEventRequest;
import com.smarttraining.analytics.entity.LearnerProgress;
import com.smarttraining.analytics.entity.LearningEvent;
import com.smarttraining.analytics.enums.EventSource;
import com.smarttraining.analytics.enums.LearningEventType;
import com.smarttraining.analytics.enums.ProgressStatus;
import com.smarttraining.analytics.integration.ProgressProjectionEvent;
import com.smarttraining.analytics.repository.LearnerProgressRepository;
import com.smarttraining.analytics.repository.LearningEventRepository;
import com.smarttraining.analytics.security.AuthenticatedUser;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthoritativeAnalyticsService {

    private static final Set<LearningEventType> SELF_TYPES = EnumSet.of(
        LearningEventType.TRAINING_OPENED,
        LearningEventType.MODULE_OPENED,
        LearningEventType.LESSON_OPENED,
        LearningEventType.RESOURCE_OPENED,
        LearningEventType.VIDEO_OPENED
    );

    private static final Set<LearningEventType> QUIZ_COMPLETION_TYPES = EnumSet.of(
        LearningEventType.QUIZ_SUBMITTED,
        LearningEventType.QUIZ_PASSED,
        LearningEventType.QUIZ_FAILED
    );

    private final LearningEventRepository eventRepository;
    private final LearnerProgressRepository progressRepository;
    private final ApplicationEventPublisher eventPublisher;

    public AuthoritativeAnalyticsService(
        LearningEventRepository eventRepository,
        LearnerProgressRepository progressRepository,
        ApplicationEventPublisher eventPublisher
    ) {
        this.eventRepository = eventRepository;
        this.progressRepository = progressRepository;
        this.eventPublisher = eventPublisher;
    }

    public LearningEventResponse recordSelfEvent(
        SelfLearningEventRequest request,
        AuthenticatedUser user
    ) {
        if (!SELF_TYPES.contains(request.getEventType())) {
            throw new AccessDeniedException(
                "Ce type d'evenement ne peut pas etre declare par le client."
            );
        }

        TrustedLearningEventRequest trusted = new TrustedLearningEventRequest();
        trusted.setLearnerId(user.getUserId());
        trusted.setTrainingId(request.getTrainingId());
        trusted.setModuleId(request.getModuleId());
        trusted.setLessonId(request.getLessonId());
        trusted.setResourceId(request.getResourceId());
        trusted.setEventType(request.getEventType());
        trusted.setSource(EventSource.CLIENT);
        trusted.setDescription(trimToNull(request.getDescription()));
        trusted.setIdempotencyKey(
            "client:" + user.getUserId() + ":" + request.getRequestId().trim()
        );

        return persistAndRecalculate(trusted);
    }

    public LearningEventResponse recordTrustedEvent(TrustedLearningEventRequest request) {
        if (request.getSource() == EventSource.CLIENT || request.getSource() == EventSource.LEGACY) {
            throw new IllegalArgumentException(
                "La route interne exige une source de microservice."
            );
        }

        validateTrusted(request);
        return persistAndRecalculate(request);
    }

    private LearningEventResponse persistAndRecalculate(TrustedLearningEventRequest request) {
        String key = request.getIdempotencyKey().trim();

        return eventRepository.findByIdempotencyKey(key)
            .map(LearningEventResponse::new)
            .orElseGet(() -> {
                LearningEvent event = new LearningEvent();
                event.setLearnerId(request.getLearnerId());
                event.setTrainingId(request.getTrainingId());
                event.setModuleId(request.getModuleId());
                event.setLessonId(request.getLessonId());
                event.setResourceId(request.getResourceId());
                event.setQuizId(request.getQuizId());
                event.setAttemptId(request.getAttemptId());
                event.setEventType(request.getEventType());
                event.setSource(request.getSource());
                event.setIdempotencyKey(key);
                event.setDescription(trimToNull(request.getDescription()));
                event.setScore(request.getScore());
                event.setTotalPoints(request.getTotalPoints());
                event.setProgressPercentage(null);
                event.setTotalLessonsSnapshot(request.getTotalLessons());
                event.setTotalQuizzesSnapshot(request.getTotalQuizzes());
                event.setEventDate(LocalDateTime.now());

                LearningEvent saved = eventRepository.save(event);
                recalculateProgress(saved.getLearnerId(), saved.getTrainingId());
                return new LearningEventResponse(saved);
            });
    }

    private void validateTrusted(TrustedLearningEventRequest request) {
        LearningEventType type = request.getEventType();

        if (type == LearningEventType.LESSON_COMPLETED) {
            if (request.getLessonId() == null
                || request.getTotalLessons() == null
                || request.getTotalLessons() <= 0) {
                throw new IllegalArgumentException(
                    "LESSON_COMPLETED exige lessonId et totalLessons."
                );
            }
        }

        if (type == LearningEventType.RESOURCE_COMPLETED
            && request.getResourceId() == null) {
            throw new IllegalArgumentException(
                "RESOURCE_COMPLETED exige resourceId."
            );
        }
        if (QUIZ_COMPLETION_TYPES.contains(type)) {
            if (request.getQuizId() == null
                || request.getAttemptId() == null
                || request.getTotalQuizzes() == null
                || request.getTotalQuizzes() <= 0) {
                throw new IllegalArgumentException(
                    "Un evenement de quiz termine exige quizId, attemptId et totalQuizzes."
                );
            }
        }

        if (type == LearningEventType.QUIZ_SUBMITTED) {
            if (request.getScore() == null
                || request.getTotalPoints() == null
                || request.getTotalPoints() <= 0
                || request.getScore() < 0
                || request.getScore() > request.getTotalPoints()) {
                throw new IllegalArgumentException(
                    "QUIZ_SUBMITTED exige un score serveur valide."
                );
            }
        }
    }

    public LearnerProgressResponse recalculateProgress(Long learnerId, Long trainingId) {
        List<LearningEvent> events = eventRepository
            .findByLearnerIdAndTrainingIdOrderByEventDateAsc(learnerId, trainingId)
            .stream()
            .filter(event -> event.getSource() != null && event.getSource() != EventSource.LEGACY)
            .toList();

        Set<Long> completedLessonIds = events.stream()
            .filter(event -> event.getEventType() == LearningEventType.LESSON_COMPLETED)
            .map(LearningEvent::getLessonId)
            .filter(id -> id != null)
            .collect(Collectors.toSet());

        Set<Long> completedQuizIds = events.stream()
            .filter(event -> QUIZ_COMPLETION_TYPES.contains(event.getEventType()))
            .map(LearningEvent::getQuizId)
            .filter(id -> id != null)
            .collect(Collectors.toSet());

        Map<Long, Integer> latestScores = new LinkedHashMap<>();

        events.stream()
            .filter(event -> event.getEventType() == LearningEventType.QUIZ_SUBMITTED)
            .filter(event ->
                event.getQuizId() != null
                && event.getScore() != null
                && event.getTotalPoints() != null
                && event.getTotalPoints() > 0
            )
            .forEach(event -> latestScores.put(
                event.getQuizId(),
                (int) Math.round(event.getScore() * 100.0 / event.getTotalPoints())
            ));

        int completedLessons = completedLessonIds.size();
        int completedQuizzes = completedQuizIds.size();

        int totalLessons = events.stream()
            .map(LearningEvent::getTotalLessonsSnapshot)
            .filter(value -> value != null)
            .mapToInt(Integer::intValue)
            .max()
            .orElse(0);

        int totalQuizzes = events.stream()
            .map(LearningEvent::getTotalQuizzesSnapshot)
            .filter(value -> value != null)
            .mapToInt(Integer::intValue)
            .max()
            .orElse(0);

        totalLessons = Math.max(totalLessons, completedLessons);
        totalQuizzes = Math.max(totalQuizzes, completedQuizzes);

        int averageScore = latestScores.isEmpty()
            ? 0
            : latestScores.values().stream().mapToInt(Integer::intValue).sum()
                / latestScores.size();

        int totalUnits = totalLessons + totalQuizzes;
        int completedUnits =
            Math.min(completedLessons, totalLessons)
            + Math.min(completedQuizzes, totalQuizzes);

        int progressPercentage = totalUnits == 0
            ? 0
            : (completedUnits * 100) / totalUnits;

        ProgressStatus status;
        if (progressPercentage >= 100 && totalUnits > 0) {
            status = ProgressStatus.COMPLETED;
        } else if (completedQuizzes > 0 && averageScore < 50) {
            status = ProgressStatus.AT_RISK;
        } else if (!events.isEmpty()) {
            status = ProgressStatus.IN_PROGRESS;
        } else {
            status = ProgressStatus.NOT_STARTED;
        }

        LearnerProgress progress = progressRepository
            .findByLearnerIdAndTrainingId(learnerId, trainingId)
            .orElseGet(LearnerProgress::new);

        progress.setLearnerId(learnerId);
        progress.setTrainingId(trainingId);
        progress.setProgressPercentage(progressPercentage);
        progress.setCompletedLessons(completedLessons);
        progress.setTotalLessons(totalLessons);
        progress.setCompletedQuizzes(completedQuizzes);
        progress.setTotalQuizzes(totalQuizzes);
        progress.setAverageScore(averageScore);
        progress.setStatus(status);

        if (status == ProgressStatus.COMPLETED) {
            if (progress.getCompletedAt() == null) {
                progress.setCompletedAt(LocalDateTime.now());
            }
        } else {
            progress.setCompletedAt(null);
        }

        LearnerProgress savedProgress = progressRepository.save(progress);

        eventPublisher.publishEvent(new ProgressProjectionEvent(
            learnerId,
            trainingId,
            savedProgress.getProgressPercentage(),
            savedProgress.getStatus().name(),
            savedProgress.getCompletedAt()
        ));

        return new LearnerProgressResponse(savedProgress);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}