package com.smarttraining.training.service;

import com.smarttraining.training.client.AnalyticsInternalClient;
import com.smarttraining.training.client.TrustedAnalyticsEventRequest;
import com.smarttraining.training.client.TrustedAnalyticsEventResponse;
import com.smarttraining.training.dto.LearningCompletionResponse;
import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.entity.Lesson;
import com.smarttraining.training.entity.PedagogicalResource;
import com.smarttraining.training.enums.EnrollmentStatus;
import com.smarttraining.training.enums.LessonCompletionRule;
import com.smarttraining.training.enums.ResourceType;
import com.smarttraining.training.repository.EnrollmentRepository;
import com.smarttraining.training.repository.LessonRepository;
import com.smarttraining.training.repository.PedagogicalResourceRepository;
import com.smarttraining.training.security.AuthenticatedUserService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningCompletionService {

    private final LessonRepository lessonRepository;
    private final PedagogicalResourceRepository resourceRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final AnalyticsInternalClient analyticsClient;

    public LearningCompletionService(
            LessonRepository lessonRepository,
            PedagogicalResourceRepository resourceRepository,
            EnrollmentRepository enrollmentRepository,
            AuthenticatedUserService authenticatedUserService,
            AnalyticsInternalClient analyticsClient
    ) {
        this.lessonRepository = lessonRepository;
        this.resourceRepository = resourceRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.analyticsClient = analyticsClient;
    }

    @Transactional(readOnly = true)
    public LearningCompletionResponse completeLesson(Long lessonId) {
        requireLearner();

        Long learnerId = authenticatedUserService.getUserId();
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lecon introuvable."));

        Long moduleId = lesson.getModule().getId();
        Long trainingId = lesson.getModule().getTraining().getId();

        requireEnrollment(learnerId, trainingId);
        requireDirectLessonCompletionAllowed(lesson);

        long totalLessonsLong = lessonRepository.countByTrainingId(trainingId);
        if (totalLessonsLong <= 0 || totalLessonsLong > Integer.MAX_VALUE) {
            throw new IllegalStateException("Nombre de lecons invalide pour la progression.");
        }

        TrustedAnalyticsEventRequest request = new TrustedAnalyticsEventRequest();
        request.setLearnerId(learnerId);
        request.setTrainingId(trainingId);
        request.setModuleId(moduleId);
        request.setLessonId(lessonId);
        request.setEventType("LESSON_COMPLETED");
        request.setSource("TRAINING_SERVICE");
        request.setIdempotencyKey(
                "training:learner:" + learnerId + ":lesson:" + lessonId + ":completed"
        );
        request.setDescription("Lecon terminee et validee par training-service.");
        request.setTotalLessons((int) totalLessonsLong);

        TrustedAnalyticsEventResponse event = analyticsClient.publish(request);

        return new LearningCompletionResponse(
                "LESSON_COMPLETED",
                learnerId,
                trainingId,
                lessonId,
                null,
                event == null ? null : event.getId(),
                true
        );
    }

    @Transactional(readOnly = true)
    public LearningCompletionResponse completeResource(Long resourceId) {
        requireLearner();

        Long learnerId = authenticatedUserService.getUserId();
        PedagogicalResource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new IllegalArgumentException("Ressource introuvable."));

        if (Boolean.FALSE.equals(resource.getActive())) {
            throw new IllegalArgumentException("Cette ressource est inactive.");
        }

        ResourceType normalizedType = resource.getType() == null
                ? null
                : resource.getType().normalized();

        if (normalizedType == ResourceType.SCORM) {
            throw new AccessDeniedException(
                    "Une ressource SCORM doit etre terminee via le runtime SCORM."
            );
        }

        Long lessonId = resource.getLesson().getId();
        Long moduleId = resource.getLesson().getModule().getId();
        Long trainingId = resource.getLesson().getModule().getTraining().getId();

        requireEnrollment(learnerId, trainingId);

        TrustedAnalyticsEventRequest request = new TrustedAnalyticsEventRequest();
        request.setLearnerId(learnerId);
        request.setTrainingId(trainingId);
        request.setModuleId(moduleId);
        request.setLessonId(lessonId);
        request.setResourceId(resourceId);
        request.setEventType("RESOURCE_COMPLETED");
        request.setSource("TRAINING_SERVICE");
        request.setIdempotencyKey(
                "training:learner:" + learnerId + ":resource:" + resourceId + ":completed"
        );
        request.setDescription("Ressource consultee et validee par training-service.");

        TrustedAnalyticsEventResponse event = analyticsClient.publish(request);

        return new LearningCompletionResponse(
                "RESOURCE_COMPLETED",
                learnerId,
                trainingId,
                lessonId,
                resourceId,
                event == null ? null : event.getId(),
                false
        );
    }

    private void requireDirectLessonCompletionAllowed(Lesson lesson) {
        LessonCompletionRule rule = lesson == null
                ? null
                : lesson.getCompletionRule();

        if (rule == null
                || rule == LessonCompletionRule.MANUAL
                || rule == LessonCompletionRule.OPENED) {
            return;
        }

        if (rule == LessonCompletionRule.ALL_REQUIRED_BLOCKS) {
            throw new AccessDeniedException(
                    "Cette lecon doit etre validee par ses blocs requis."
            );
        }

        if (rule == LessonCompletionRule.ASSESSMENT_PASSED) {
            throw new AccessDeniedException(
                    "Cette lecon doit etre validee par une evaluation reussie."
            );
        }

        if (rule == LessonCompletionRule.SCORM_COMPLETED) {
            throw new AccessDeniedException(
                    "Cette lecon doit etre validee par le runtime SCORM."
            );
        }

        throw new AccessDeniedException(
                "Regle de completion non autorisee pour une validation directe."
        );
    }

    private Enrollment requireEnrollment(Long learnerId, Long trainingId) {
        Enrollment enrollment = enrollmentRepository
                .findByLearnerIdAndTrainingId(learnerId, trainingId)
                .orElseThrow(() -> new AccessDeniedException(
                        "L'apprenant n'est pas inscrit a cette formation."
                ));

        if (enrollment.getStatus() == EnrollmentStatus.CANCELLED) {
            throw new AccessDeniedException("Cette inscription est annulee.");
        }

        return enrollment;
    }

    private void requireLearner() {
        String role = authenticatedUserService.getRole();

        if (!"APPRENANT".equals(role)
                && !"FORMATEUR".equals(role)
                && !"ADMIN".equals(role)) {
            throw new AccessDeniedException(
                    "Cette action necessite une identite utilisateur pouvant suivre une formation."
            );
        }
    }
}
