package com.smarttraining.training.service;

import com.smarttraining.training.dto.EnrollmentResponse;
import com.smarttraining.training.dto.LearnerMyTrainingResponse;
import com.smarttraining.training.dto.LearnerTrainingContentResponse;
import com.smarttraining.training.dto.ResourceResponse;
import com.smarttraining.training.dto.TrainingResponse;
import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.entity.Lesson;
import com.smarttraining.training.entity.PedagogicalResource;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.entity.TrainingModule;
import com.smarttraining.training.enums.EnrollmentStatus;
import com.smarttraining.training.repository.EnrollmentRepository;
import com.smarttraining.training.repository.LessonRepository;
import com.smarttraining.training.repository.PedagogicalResourceRepository;
import com.smarttraining.training.repository.TrainingModuleRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.AuthenticatedUserService;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class LearnerContentService {

    private final EnrollmentRepository enrollmentRepository;
    private final TrainingRepository trainingRepository;
    private final TrainingModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final PedagogicalResourceRepository resourceRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final EnrollmentAccessService enrollmentAccessService;

    public LearnerContentService(
            EnrollmentRepository enrollmentRepository,
            TrainingRepository trainingRepository,
            TrainingModuleRepository moduleRepository,
            LessonRepository lessonRepository,
            PedagogicalResourceRepository resourceRepository,
            AuthenticatedUserService authenticatedUserService,
            EnrollmentAccessService enrollmentAccessService
    ) {
        this.enrollmentRepository = enrollmentRepository;
        this.trainingRepository = trainingRepository;
        this.moduleRepository = moduleRepository;
        this.lessonRepository = lessonRepository;
        this.resourceRepository = resourceRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.enrollmentAccessService = enrollmentAccessService;
    }

    public List<LearnerMyTrainingResponse> getMyTrainings() {
        Long learnerId = requireLearnerId();

        return enrollmentRepository
                .findByLearnerIdWithTraining(learnerId)
                .stream()
                .filter(this::isUsableEnrollment)
                .map(enrollment -> new LearnerMyTrainingResponse(
                        new TrainingResponse(enrollment.getTraining()),
                        new EnrollmentResponse(enrollment)
                ))
                .toList();
    }

    public LearnerTrainingContentResponse getMyTrainingContent(
            Long trainingId
    ) {
        Long learnerId = requireLearnerId();

        Enrollment enrollment = enrollmentRepository
                .findByLearnerIdAndTrainingId(learnerId, trainingId)
                .orElseThrow(() -> new AccessDeniedException(
                        "Vous n'etes pas inscrit a cette formation"
                ));

        if (!isUsableEnrollment(enrollment)) {
            throw new AccessDeniedException(
                    "Cette formation n'est pas disponible dans vos formations"
            );
        }

        Training training = trainingRepository.findById(trainingId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Formation introuvable")
                );

        List<TrainingModule> modules =
                moduleRepository
                        .findByTrainingIdOrderByOrderIndexAsc(trainingId);

        List<LearnerTrainingContentResponse.ModuleContent> moduleResponses =
                modules.stream()
                        .map(module -> {
                            List<Lesson> lessons =
                                    lessonRepository
                                            .findByModuleIdOrderByOrderIndexAsc(
                                                    module.getId()
                                            );

                            List<LearnerTrainingContentResponse.LessonContent>
                                    lessonResponses =
                                    lessons.stream()
                                            .map(lesson -> {
                                                List<PedagogicalResource>
                                                        resources =
                                                        resourceRepository
                                                                .findByLessonIdOrderByOrderIndexAsc(
                                                                        lesson.getId()
                                                                );

                                                List<LearnerTrainingContentResponse.ResourceContent>
                                                        resourceResponses =
                                                        resources.stream()
                                                                .filter(resource ->
                                                                        !Boolean.FALSE.equals(
                                                                                resource.getActive()
                                                                        )
                                                                )
                                                                .map(resource ->
                                                                        new LearnerTrainingContentResponse.ResourceContent(
                                                                                new ResourceResponse(resource)
                                                                        )
                                                                )
                                                                .toList();

                                                return new LearnerTrainingContentResponse.LessonContent(
                                                        lesson,
                                                        resourceResponses
                                                );
                                            })
                                            .toList();

                            return new LearnerTrainingContentResponse.ModuleContent(
                                    module,
                                    lessonResponses
                            );
                        })
                        .toList();

        return new LearnerTrainingContentResponse(
                new TrainingResponse(training),
                new EnrollmentResponse(enrollment),
                moduleResponses,
                enrollmentAccessService.canSelfUnenroll(enrollment)
        );
    }

    private boolean isUsableEnrollment(Enrollment enrollment) {
        if (enrollment == null
                || enrollment.getTraining() == null
                || EnrollmentStatus.CANCELLED.equals(enrollment.getStatus())) {
            return false;
        }

        Training training = enrollment.getTraining();

        return training.getStatus() != null
                && training.getStatus().isVisibleToLearner();
    }

    private Long requireLearnerId() {
        String role = authenticatedUserService.getRole();

        if (!"APPRENANT".equals(role)
                && !"FORMATEUR".equals(role)
                && !"ADMIN".equals(role)) {
            throw new AccessDeniedException(
                    "Cette vue necessite une identite utilisateur pouvant suivre une formation"
            );
        }

        return authenticatedUserService.getUserId();
    }
}